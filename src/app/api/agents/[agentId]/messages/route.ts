import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { uploadToImagebed } from '@/lib/imagebed'
import type { Prisma } from '@prisma/client'

// 简单的敏感词拦截列表（可根据需要扩充）
const BANNED_KEYWORDS = [
  '色情', '淫秽', '裸露', '成人', '性爱', '性行为', '强奸', '未成年人',
  'porn', 'sex', 'nude', 'hentai', 'erotic', 'nsfw'
]

const DEFAULT_FETCH_TIMEOUT_MS = 180000 // 3分钟，图片生成需要较长时间

function safeParseStringArrayJson(text: string | null | undefined): string[] | null {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return null
    const result = parsed.filter((item: unknown) => typeof item === 'string' && item.trim() !== '')
    return result.length > 0 ? result : null
  } catch {
    return null
  }
}

// 获取客户端 IP 地址
function getClientIP(request: NextRequest): string {
  // 优先从常见的代理头获取
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare

  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }

  if (realIP) {
    return realIP.trim()
  }

  if (forwarded) {
    // x-forwarded-for 可能包含多个 IP，第一个是客户端真实 IP
    const firstIP = forwarded.split(',')[0].trim()
    // 过滤掉内网 IP
    if (!isPrivateIP(firstIP)) {
      return firstIP
    }
  }

  return '127.0.0.1'
}

// 判断是否为内网 IP
function isPrivateIP(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === 'localhost') return true
  if (ip.startsWith('192.168.')) return true
  if (ip.startsWith('10.')) return true
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1], 10)
    if (second >= 16 && second <= 31) return true
  }
  return false
}

// 根据 IP 获取地理位置并生成昵称
async function generateNickname(ip: string): Promise<string> {
  if (isPrivateIP(ip)) {
    return '本地用户'
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
      signal: AbortSignal.timeout(3000)
    })

    if (!response.ok) {
      throw new Error('IP API 请求失败')
    }

    const data = await response.json()

    if (data.status === 'success') {
      const city = data.city || data.regionName || data.country
      return `来自${city}的朋友`
    }
  } catch (error) {
    console.error('获取地理位置失败:', error)
  }

  return '神秘访客'
}

type AiMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

type AiMessage = {
  role: 'system' | 'user'
  content: string | AiMessageContentPart[]
}

type ImageConfig = {
  apiUrl: string
  apiKey: string
  model: string
}

type ModerationConfig = {
  apiUrl: string
  apiKey: string
  model: string
}

type AuditResult = { allowed: true } | { allowed: false; reason: string }

function enqueueSseEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: string,
  data: unknown
) {
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
}

function createStepReporter(options: {
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
  trace: string
}) {
  const { controller, encoder, trace } = options
  return (step: string, detail?: Record<string, unknown>) => {
    const payload = { step, ...(detail || {}) }
    console.log(`[${trace}] ${step}`, detail || '')
    // 前端暂未消费 step 事件，不影响现有逻辑；后续可用于更细粒度的进度展示
    enqueueSseEvent(controller, encoder, 'step', payload)
  }
}

function extractImageDataFromResponseContent(responseContent: string): string {
  const base64Match = responseContent.match(/!\[.*?\]\((data:image\/[^;]+;base64,[^)]+)\)/)
  if (base64Match) return base64Match[1]

  const urlMatch = responseContent.match(/\[.*?\]\((https?:\/\/[^)]+)\)/)
  if (urlMatch) return urlMatch[1]

  throw new Error('未能从 AI 响应中提取图片数据')
}

function buildImagePromptMessages(
  agentSystemPrompt: string,
  userContent: string,
  referenceImages: string[]
): AiMessage[] {
  const messages: AiMessage[] = [
    {
      role: 'system',
      content: agentSystemPrompt
    }
  ]

  if (referenceImages.length > 0) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text' as const, text: userContent },
        ...referenceImages.map(img => ({
          type: 'image_url' as const,
          image_url: { url: img }
        }))
      ]
    })
    return messages
  }

  messages.push({
    role: 'user',
    content: userContent
  })
  return messages
}

function buildImageConfig(settings: { imageApiUrl: string; imageApiKey: string; imageModel: string } | null): ImageConfig {
  return {
    apiUrl: settings?.imageApiUrl || process.env.IMAGE_API_URL || '',
    apiKey: settings?.imageApiKey || process.env.IMAGE_API_KEY || '',
    model: settings?.imageModel || process.env.IMAGE_MODEL || ''
  }
}

function buildModerationConfig(settings: { moderationApiUrl: string; moderationApiKey: string; moderationModel: string } | null): ModerationConfig {
  return {
    apiUrl: settings?.moderationApiUrl || process.env.MODERATION_API_URL || '',
    apiKey: settings?.moderationApiKey || process.env.MODERATION_API_KEY || '',
    model: settings?.moderationModel || process.env.MODERATION_MODEL || ''
  }
}

async function runAudit(options: {
  moderation: ModerationConfig
  agentPolicyPrompt: string | null | undefined
  content: string
  referenceImageCount: number
}): Promise<AuditResult> {
  const { moderation, agentPolicyPrompt, content, referenceImageCount } = options
  if (!moderation.apiUrl || !moderation.model) return { allowed: true }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (moderation.apiKey) headers.Authorization = `Bearer ${moderation.apiKey}`

  const resp = await fetch(moderation.apiUrl, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT_MS),
    body: JSON.stringify({
      model: moderation.model,
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            '你是内容安全审核助手。任务：判断用户输入是否符合安全与智能体规则。' +
            '输出严格 JSON：{"allowed":true|false,"reason":"..."}。' +
            `智能体规则（如有）：${agentPolicyPrompt || '默认：禁止涉黄、暴力、违法、隐私泄露等高风险内容。'}`
        },
        {
          role: 'user',
          content:
            `用户文本：${content}` +
            (referenceImageCount > 0 ? `\n参考图数量：${referenceImageCount}` : '')
        }
      ]
    })
  })

  const data = await resp.json().catch(() => null)
  const modContent =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    ''
  const jsonStr =
    typeof modContent === 'string'
      ? modContent.slice(modContent.indexOf('{'), modContent.lastIndexOf('}') + 1)
      : null
  if (jsonStr) {
    const parsed = JSON.parse(jsonStr)
    if (parsed.allowed === false) {
      const reason = typeof parsed.reason === 'string' && parsed.reason ? parsed.reason : '内容未通过审核'
      return { allowed: false, reason }
    }
  }
  return { allowed: true }
}

async function summarizeContent(options: {
  moderation: ModerationConfig
  content: string
}): Promise<string> {
  const { moderation, content } = options
  if (content.length <= 50) return `为你呈现: ${content}`

  if (moderation.apiUrl && moderation.model) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (moderation.apiKey) headers.Authorization = `Bearer ${moderation.apiKey}`

      const summaryResp = await fetch(moderation.apiUrl, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT_MS),
        body: JSON.stringify({
          model: moderation.model,
          stream: false,
          messages: [
            {
              role: 'system',
              content: '你是中文摘要助手，请在不添加新信息的前提下，将用户需求概括为不超过30字的简介，用于AI图片创作提示。只输出摘要文本，不要解释。'
            },
            {
              role: 'user',
              content
            }
          ]
        })
      })

      if (summaryResp.ok) {
        const summaryData = await summaryResp.json()
        const summaryText: string | undefined = summaryData?.choices?.[0]?.message?.content
        if (summaryText && typeof summaryText === 'string') {
          return `为你呈现：${summaryText.trim()}`
        }
      }
    } catch (err) {
      console.error('生成摘要失败:', err)
    }
  }

  return `为你呈现：${content.slice(0, 50)}…`
}

async function generateImage(options: {
  image: ImageConfig
  messages: AiMessage[]
  startTime: number
}): Promise<{ imageData: string; generationTime: number }> {
  const { image, messages, startTime } = options

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), DEFAULT_FETCH_TIMEOUT_MS)
  try {
    const aiResponse = await fetch(image.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${image.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: image.model,
        messages,
        stream: false
      }),
      signal: abortController.signal
    })

    if (!aiResponse.ok) {
      throw new Error(`AI API 请求失败: ${aiResponse.statusText}`)
    }

    const aiData = await aiResponse.json()
    const generationTime = Date.now() - startTime

    const responseContent =
      aiData.choices?.[0]?.delta?.content ||
      aiData.choices?.[0]?.message?.content ||
      ''

    const imageData = extractImageDataFromResponseContent(responseContent)
    return { imageData, generationTime }
  } finally {
    clearTimeout(timeout)
    abortController.abort()
  }
}

async function runImageFlowSse(options: {
  controller: ReadableStreamDefaultController<Uint8Array>
  encoder: TextEncoder
  agent: { id: string; name: string; avatar: string; systemPrompt: string; policyPrompt?: string | null }
  user: { id: string }
  content: string
  referenceImages: string[]
  publishToSquare: boolean
}) {
  const { controller, encoder, agent, user, content, referenceImages, publishToSquare } = options
  const step = createStepReporter({ controller, encoder, trace: `messages:${agent.id}` })
  const startTime = Date.now() // 提前记录开始时间，用于计算耗时
  let closed = false

  const safeClose = () => {
    if (!closed) {
      closed = true
      try {
        controller.close()
      } catch {
        // 忽略关闭错误
      }
    }
  }

  const safeEnqueue = (event: string, data: unknown) => {
    if (!closed) {
      try {
        enqueueSseEvent(controller, encoder, event, data)
      } catch {
        // 忽略写入错误
      }
    }
  }

  try {
    const userMessage = await prisma.message.create({
      data: {
        content,
        referenceImagesJson: referenceImages.length > 0 ? JSON.stringify(referenceImages) : null,
        type: referenceImages.length > 0 ? 'image' : 'text',
        userId: user.id,
        agentId: agent.id,
        isPublishedToSquare: publishToSquare
      }
    })
    safeEnqueue('user-message', {
      id: userMessage.id,
      content: userMessage.content,
      timestamp: userMessage.createdAt
    })
    step('1/8 已保存用户消息', { messageId: userMessage.id })

    safeEnqueue('generating', {
      status: 'processing',
      message: '正在创作中...'
    })
    step('2/8 已进入生成中状态')

    const settings = await prisma.settings.findUnique({ where: { id: 'global' } })
    const imageConfig = buildImageConfig(settings)
    const moderationConfig = buildModerationConfig(settings)
    if (!imageConfig.apiUrl || !imageConfig.apiKey || !imageConfig.model) {
      throw new Error('未配置图片生成 API，请在后台或环境变量中设置 IMAGE_API_URL / IMAGE_API_KEY / IMAGE_MODEL')
    }
    step('3/8 已读取全局配置')

    const promptMessages = buildImagePromptMessages(agent.systemPrompt, content, referenceImages)
    const summaryPromise = summarizeContent({ moderation: moderationConfig, content })
    step('4/8 已构建提示词并启动摘要')

    const auditResult = await runAudit({
      moderation: moderationConfig,
      agentPolicyPrompt: agent.policyPrompt,
      content,
      referenceImageCount: referenceImages.length
    })
    if (!auditResult.allowed) {
      safeEnqueue('error', {
        code: 'CONTENT_BLOCKED',
        message: auditResult.reason || '内容未通过审核'
      })
      safeClose()
      return
    }
    step('5/8 审核通过')

    const genPromise = generateImage({ image: imageConfig, messages: promptMessages, startTime })
    const [genResult, summaryText] = await Promise.all([genPromise, summaryPromise])
    step('6/8 已生成图片')

    // 上传图片到图床，统一转换为永久链接
    let finalImageUrl = genResult.imageData
    const uploadResult = await uploadToImagebed(genResult.imageData)
    if (uploadResult.success && uploadResult.url) {
      finalImageUrl = uploadResult.url
      step('6.5/8 已上传至图床', { url: finalImageUrl })
    } else {
      console.warn('图床上传失败，使用原始数据:', uploadResult.error)
    }

    step('7/8 已生成摘要')

    const aiMessage = await prisma.message.create({
      data: {
        content: summaryText,
        imageData: finalImageUrl,
        referenceImagesJson: referenceImages.length > 0 ? JSON.stringify(referenceImages) : null,
        type: 'image',
        userId: user.id,
        agentId: agent.id,
        generationTime: genResult.generationTime,
        isPublishedToSquare: publishToSquare,
        userMessageId: userMessage.id
      }
    })
    step('8/8 已落库 AI 消息', { messageId: aiMessage.id, generationTime: genResult.generationTime })

    safeEnqueue('ai-message', {
      id: aiMessage.id,
      content: aiMessage.content,
      imageData: aiMessage.imageData,
      timestamp: aiMessage.createdAt
    })
    safeEnqueue('done', { generationTime: genResult.generationTime })
    safeClose()
  } catch (error) {
    console.error('生成图片失败:', error)

    // 生成失败也要入库，保存错误消息
    const errorMessage = error instanceof Error ? error.message : '生成失败'
    try {
      const failedMessage = await prisma.message.create({
        data: {
          content: `⚠️ 生成失败：${errorMessage}`,
          imageData: null,
          type: 'text',
          userId: user.id,
          agentId: agent.id,
          generationTime: Date.now() - startTime,
          isPublishedToSquare: false
        }
      })

      safeEnqueue('ai-message', {
        id: failedMessage.id,
        content: failedMessage.content,
        imageData: null,
        timestamp: failedMessage.createdAt
      })
    } catch (dbError) {
      console.error('保存失败消息到数据库失败:', dbError)
    }

    safeEnqueue('error', {
      code: 'AI_SERVICE_ERROR',
      message: errorMessage
    })
    safeClose()
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before')

    // 获取当前用户 IP
    const ip = getClientIP(request)

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { ip }
    })

    if (!user) {
      const nickname = await generateNickname(ip)
      user = await prisma.user.create({
        data: {
          ip,
          nickname,
          avatar: ''
        }
      })
    }

    // 构建查询条件：只查询当前用户在该智能体下的消息
    const where: Prisma.MessageWhereInput = {
      agentId,
      userId: user.id
    }

    if (before) {
      where.id = { lt: before }
    }

    // 查询消息
    const messages = await prisma.message.findMany({
      where,
      include: {
        user: true,
        agent: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit + 1 // 多取一条用于判断是否还有更多
    })

    const hasMore = messages.length > limit
    const returnMessages = hasMore ? messages.slice(0, limit) : messages

    // 格式化消息
    const formattedMessages = returnMessages.map(msg => {
      const hasGenerationTime = msg.generationTime !== null && msg.generationTime !== undefined
      const hasGeneratedImage = typeof msg.imageData === 'string' && msg.imageData.trim() !== ''
      const isAi = hasGenerationTime || hasGeneratedImage
      const referenceImages = safeParseStringArrayJson(msg.referenceImagesJson)
      return {
        id: msg.id,
        userId: msg.userId,
        content: msg.content,
        imageData: msg.imageData,
        referenceImages,
        type: msg.type,
        // 通过是否有生成耗时字段判定 AI/用户，避免 AI 消息被标记为用户
        sender: isAi ? 'ai' : 'user',
        // AI 消息使用智能体名称/头像，用户消息使用用户昵称/头像
        senderName: isAi ? msg.agent.name : (msg.user?.nickname || '用户'),
        senderAvatar: isAi ? msg.agent.avatar : (msg.user?.avatar || ''),
        timestamp: msg.createdAt,
        generationTime: msg.generationTime,
        isPublishedToSquare: msg.isPublishedToSquare
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        messages: formattedMessages.reverse(), // 反转为正序
        hasMore,
        nextCursor: hasMore ? returnMessages[returnMessages.length - 1].id : null
      }
    })
  } catch (error) {
    console.error('获取聊天记录失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取聊天记录失败'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params

  try {
    const body = await request.json()
    const { content, publishToSquare } = body
    const referenceImages: string[] = Array.isArray(body.referenceImages)
      ? body.referenceImages.filter((item: unknown) => typeof item === 'string' && item.trim() !== '')
      : []

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '消息内容不能为空'
          }
        },
        { status: 400 }
      )
    }

    // 关键字过滤
    const normalized = content.toLowerCase()
    const hit = BANNED_KEYWORDS.find(keyword => normalized.includes(keyword.toLowerCase()))
    if (hit) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONTENT_BLOCKED',
            message: '包含违规关键词，已被拦截'
          }
        },
        { status: 400 }
      )
    }

    // 获取智能体信息
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    })

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '智能体不存在'
          }
        },
        { status: 404 }
      )
    }

    const minContentLength = agent.minContentLength ?? 0
    const minReferenceImages = agent.minReferenceImages ?? 0

    if (minContentLength > 0 && content.trim().length < minContentLength) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONTENT_TOO_SHORT',
            message: `需要至少 ${minContentLength} 个字`
          }
        },
        { status: 400 }
      )
    }

    if (minReferenceImages > 0 && referenceImages.length < minReferenceImages) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REFERENCE_IMAGE_REQUIRED',
            message: `该智能体需要至少 ${minReferenceImages} 张参考图`
          }
        },
        { status: 400 }
      )
    }

    const maxImages = Math.max(minReferenceImages || 0, 5)
    const limitedReferenceImages = referenceImages.slice(0, maxImages)

    // 获取或创建用户
    const ip = getClientIP(request)
    let user = await prisma.user.findUnique({
      where: { ip }
    })

    if (!user) {
      const nickname = await generateNickname(ip)
      user = await prisma.user.create({
        data: {
          ip,
          nickname,
          // 头像留空时由前端统一回退到 ui-avatars
          avatar: ''
        }
      })
    }

    // 创建 SSE 流式响应
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        await runImageFlowSse({
          controller,
          encoder,
          agent,
          user,
          content,
          referenceImages: limitedReferenceImages,
          publishToSquare: publishToSquare === true
        })
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('发送消息失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '发送消息失败'
        }
      },
      { status: 500 }
    )
  }
}

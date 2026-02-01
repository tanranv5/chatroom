import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/adminAuth'

type PolishRequestBody = {
  name?: string
  systemPrompt: string
  description?: string
  skills?: string
  policyPrompt?: string
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const body = (await request.json()) as Partial<PolishRequestBody>
    const name = safeString(body.name).trim()
    const systemPrompt = safeString(body.systemPrompt).trim()
    const description = safeString(body.description).trim()
    const skills = safeString(body.skills).trim()
    const policyPrompt = safeString(body.policyPrompt).trim()

    if (!systemPrompt) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '系统提示词不能为空' } },
        { status: 400 }
      )
    }

    // 从全局设置读取“审核模型”配置，用于润色/审查类任务
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } })
    const apiUrl = settings?.moderationApiUrl || process.env.MODERATION_API_URL || ''
    const apiKey = settings?.moderationApiKey || process.env.MODERATION_API_KEY || ''
    const model = settings?.moderationModel || process.env.MODERATION_MODEL || ''

    if (!apiUrl || !model) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CONFIG_MISSING', message: '未配置审核模型，请在后台全局设置中填写审核模型 API 端点与模型名称' }
        },
        { status: 500 }
      )
    }

    const messages = [
      {
        role: 'system',
        content:
          '你是资深中文产品文案与提示词编辑助手。你的任务是：基于“智能体系统提示词”的定位与风格，润色三个字段：【描述 description】【技能特长 skills】【规则提示词 policyPrompt】。\n' +
          '额外要求：\n' +
          ' - 若提供了 name，需要输出更简洁有记忆点的中文名称。\n' +
          '要求：\n' +
          '1) 保留原意，不新增未提及的能力/承诺，不编造数据。\n' +
          '2) 中文表达自然、精炼、可读性强。\n' +
          '3) 规则提示词 policyPrompt 只写“禁止生成/禁止回复”的内容，避免其他说明；若没有需要禁止的项则输出空字符串。\n' +
          '4) 若某字段为空字符串，则输出也必须为空字符串。\n' +
          '5) 仅输出严格 JSON（不要 Markdown，不要解释）：{"name":"...","description":"...","skills":"...","policyPrompt":"..."}'
      },
      {
        role: 'user',
        content:
          `【当前名称】\n${name}\n\n` +
          `【智能体系统提示词】\n${systemPrompt}\n\n` +
          `【当前描述】\n${description}\n\n` +
          `【当前技能特长】\n${skills}\n\n` +
          `【当前规则提示词】\n${policyPrompt}\n`
      }
    ]

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, stream: false }),
        signal: controller.signal
      })

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        return NextResponse.json(
          { success: false, error: { code: 'AI_SERVICE_ERROR', message: `审核模型请求失败: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}` } },
          { status: 502 }
        )
      }

      const data = await resp.json()
      const content: string =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.delta?.content ??
        ''

      const jsonStr = extractJsonObject(String(content))
      if (!jsonStr) {
        return NextResponse.json(
          { success: false, error: { code: 'PARSE_ERROR', message: '无法解析模型返回内容（未找到 JSON）' } },
          { status: 502 }
        )
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(jsonStr)
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'PARSE_ERROR', message: '无法解析模型返回内容（JSON 格式错误）' } },
          { status: 502 }
        )
      }

      if (!isRecord(parsed)) {
        return NextResponse.json(
          { success: false, error: { code: 'PARSE_ERROR', message: '无法解析模型返回内容（JSON 不是对象）' } },
          { status: 502 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          name: safeString(parsed.name),
          description: safeString(parsed.description),
          skills: safeString(parsed.skills),
          policyPrompt: safeString(parsed.policyPrompt)
        }
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: { code: 'TIMEOUT', message: '润色请求超时（30秒），请重试' } },
          { status: 504 }
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    console.error('润色失败:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '润色失败' } },
      { status: 500 }
    )
  }
}

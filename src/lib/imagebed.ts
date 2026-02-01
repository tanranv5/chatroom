/**
 * 图床上传服务
 * 支持 base64 和 URL 两种图片来源，统一上传到图床并返回永久链接
 */

import prisma from '@/lib/prisma'

const UPLOAD_TIMEOUT_MS = 30000

interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

interface ImagebedConfig {
  url: string
  token: string
}

/**
 * 获取图床配置（优先数据库，回退环境变量）
 */
async function getImagebedConfig(): Promise<ImagebedConfig> {
  const settings = await prisma.settings.findUnique({ where: { id: 'global' } })
  return {
    url: settings?.imagebedUrl || '',
    token: settings?.imagebedToken || ''
  }
}

/**
 * 从 base64 数据创建 Blob
 */
function base64ToBlob(base64Data: string): { blob: Blob; mimeType: string } {
  // 移除 data:image/xxx;base64, 前缀
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('无效的 base64 图片格式')
  }

  const mimeType = matches[1]
  const base64 = matches[2]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return {
    blob: new Blob([bytes], { type: mimeType }),
    mimeType
  }
}

/**
 * 从 URL 下载图片并转换为 Blob
 */
async function urlToBlob(url: string): Promise<{ blob: Blob; mimeType: string }> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`下载图片失败: ${response.statusText}`)
  }

  const blob = await response.blob()
  const mimeType = blob.type || 'image/png'

  return { blob, mimeType }
}

/**
 * 根据 MIME 类型获取文件扩展名
 */
function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp'
  }
  return map[mimeType] || 'png'
}

/**
 * 上传图片到图床
 * @param imageData base64 数据（data:image/xxx;base64,...）或图片 URL
 * @returns 上传结果，包含图床 URL
 */
export async function uploadToImagebed(imageData: string): Promise<UploadResult> {
  try {
    const config = await getImagebedConfig()

    if (!config.url) {
      return {
        success: false,
        error: '未配置图床服务地址'
      }
    }

    let blob: Blob
    let mimeType: string

    // 判断是 base64 还是 URL
    if (imageData.startsWith('data:image/')) {
      const result = base64ToBlob(imageData)
      blob = result.blob
      mimeType = result.mimeType
    } else if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      const result = await urlToBlob(imageData)
      blob = result.blob
      mimeType = result.mimeType
    } else {
      return {
        success: false,
        error: '不支持的图片格式'
      }
    }

    // 生成唯一文件名
    const filename = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${getExtension(mimeType)}`

    // 构建 FormData
    const formData = new FormData()
    formData.append('file', blob, filename)

    // 上传到图床
    const headers: Record<string, string> = {}
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`
    }

    const response = await fetch(`${config.url}/upload`, {
      method: 'POST',
      headers,
      body: formData,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS)
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`图床上传失败: ${errorText}`)
    }

    const data = await response.json()

    // 兼容多种返回格式
    // 格式1: { url: "..." }
    // 格式2: { data: { url: "..." } }
    // 格式3: { data: { links: { url: "..." } } }
    // 格式4: { src: "..." }
    const imageUrl =
      (Array.isArray(data) && data[0]?.src)

    if (!imageUrl) {
      console.error('图床返回数据:', JSON.stringify(data))
      throw new Error('无法从图床响应中获取图片 URL')
    }

    return {
      success: true,
      url: config.url + imageUrl
    }
  } catch (error) {
    console.error('图床上传错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    }
  }
}

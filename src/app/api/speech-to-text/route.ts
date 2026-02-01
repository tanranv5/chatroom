import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_SPEECH_API_URL = process.env.SPEECH_API_URL || ''
const DEFAULT_SPEECH_API_KEY = process.env.SPEECH_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { audio_file } = body

    if (!audio_file || !audio_file.data) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '请提供音频文件' } },
        { status: 400 }
      )
    }

    // 从配置中读取语音识别 API 地址
    const settings = await prisma.settings.findUnique({
      where: { id: 'global' },
    })

    const ASR_API_URL = settings?.speechApiUrl || DEFAULT_SPEECH_API_URL
    const ASR_API_KEY = settings?.speechApiKey || DEFAULT_SPEECH_API_KEY

    if (!ASR_API_URL) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFIG_MISSING', message: '未配置语音识别 API 地址，请在后台或环境变量中设置 SPEECH_API_URL' } },
        { status: 500 }
      )
    }

    const audioBuffer = Buffer.from(audio_file.data, 'base64')
    const formData = new FormData()
    formData.append('model', 'qwen3-asr')
    formData.append('file', new Blob([audioBuffer], { type: audio_file.type || 'audio/webm' }), audio_file.name || 'audio.wav')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const headers: HeadersInit = {}
      if (ASR_API_KEY) {
        headers['Authorization'] = `Bearer ${ASR_API_KEY}`
      }

      const response = await fetch(ASR_API_URL, {
        method: 'POST',
        body: formData,
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`语音识别 API 请求失败: ${response.statusText}`)
      }

      const data = await response.json()

      return NextResponse.json({
        success: true,
        data: { text: data.text || '', language: '' }
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('语音识别请求超时（30秒）')
      }
      throw fetchError
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'AI_SERVICE_ERROR', message: error instanceof Error ? error.message : '语音识别失败' } },
      { status: 500 }
    )
  }
}

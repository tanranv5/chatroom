import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// 获取客户端 IP 地址
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  // 开发环境默认 IP
  return '127.0.0.1'
}

// 根据 IP 获取地理位置并生成昵称
async function generateNickname(ip: string): Promise<string> {
  // 如果是本地 IP，返回默认昵称
  if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.')) {
    return '本地用户'
  }

  try {
    // 使用免费的 IP 地理位置 API
    const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
      signal: AbortSignal.timeout(3000) // 3秒超时
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

  // 失败时返回默认昵称
  return '神秘访客'
}

export async function GET(request: NextRequest) {
  try {
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
          // 头像留空时由前端统一回退到 ui-avatars
          avatar: ''
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        ip: user.ip,
        nickname: user.nickname,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('获取用户信息失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取用户信息失败'
        }
      },
      { status: 500 }
    )
  }
}

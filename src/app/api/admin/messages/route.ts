import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/adminAuth'
import type { Prisma } from '@prisma/client'

// GET /api/admin/messages - 分页查询聊天记录
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '10', 10), 1), 50)
    const agentId = searchParams.get('agentId') || undefined
    const keyword = searchParams.get('keyword')?.trim()
    const type = searchParams.get('type') || undefined
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc'

    const where: Prisma.MessageWhereInput = {}

    if (agentId) {
      where.agentId = agentId
    }

    if (type && ['text', 'image'].includes(type)) {
      where.type = type
    }

    if (keyword) {
      where.OR = [
        { content: { contains: keyword } },
        { user: { nickname: { contains: keyword } } },
        { user: { ip: { contains: keyword } } },
        { agent: { name: { contains: keyword } } },
      ]
    }

    const [total, records] = await Promise.all([
      prisma.message.count({ where }),
      prisma.message.findMany({
        where,
        include: { user: true, agent: true },
        orderBy: { createdAt: order },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        page,
        pageSize,
        total,
        items: records.map(msg => ({
          id: msg.id,
          content: msg.content,
          type: msg.type,
          createdAt: msg.createdAt,
          generationTime: msg.generationTime,
          referenceImages: msg.referenceImagesJson ? (() => {
            try {
              const parsed = JSON.parse(msg.referenceImagesJson)
              return Array.isArray(parsed) ? parsed : null
            } catch {
              return null
            }
          })() : null,
          imageData: msg.imageData,
          user: {
            id: msg.user.id,
            nickname: msg.user.nickname,
            ip: msg.user.ip
          },
          agent: {
            id: msg.agent.id,
            name: msg.agent.name
          }
        }))
      }
    })
  } catch (error) {
    console.error('获取聊天记录失败:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '获取聊天记录失败' } },
      { status: 500 }
    )
  }
}

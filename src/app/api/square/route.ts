import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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

interface SquareMessageRow {
  id: string
  userId: string
  content: string
  imageData: string
  type: string
  generationTime: number | null
  createdAt: string
  userNickname: string | null
  userIp: string | null
  agentName: string
  agentAvatar: string
  userContent: string | null
  userReferenceImagesJson: string | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before')

    // 简单的 LEFT JOIN：AI 消息通过 userMessageId 关联用户消息
    const beforeCondition = before ? `AND ai.id < '${before}'` : ''

    const rows = await prisma.$queryRawUnsafe<SquareMessageRow[]>(`
      SELECT
        ai.id,
        ai.userId,
        ai.content,
        ai.imageData,
        ai.type,
        ai.generationTime,
        ai.createdAt,
        u.nickname as userNickname,
        u.ip as userIp,
        a.name as agentName,
        a.avatar as agentAvatar,
        um.content as userContent,
        um.referenceImagesJson as userReferenceImagesJson
      FROM Message ai
      LEFT JOIN User u ON ai.userId = u.id
      LEFT JOIN Agent a ON ai.agentId = a.id
      LEFT JOIN Message um ON ai.userMessageId = um.id
      WHERE ai.isPublishedToSquare = 1
        AND ai.imageData IS NOT NULL
        AND ai.generationTime IS NOT NULL
        ${beforeCondition}
      ORDER BY ai.createdAt DESC
      LIMIT ${limit + 1}
    `)

    const hasMore = rows.length > limit
    const returnRows = hasMore ? rows.slice(0, limit) : rows

    const formattedMessages = returnRows.map(row => ({
      id: row.id,
      userId: row.userId,
      content: row.userContent || row.content,
      imageData: row.imageData,
      referenceImages: safeParseStringArrayJson(row.userReferenceImagesJson),
      type: row.type,
      userNickname: row.userNickname || '用户',
      userIp: row.userIp || '',
      agentName: row.agentName,
      agentAvatar: row.agentAvatar,
      timestamp: new Date(row.createdAt),
      generationTime: row.generationTime
    }))

    return NextResponse.json({
      success: true,
      data: {
        messages: formattedMessages,
        hasMore,
        nextCursor: hasMore ? returnRows[returnRows.length - 1].id : null
      }
    })
  } catch (error) {
    console.error('获取广场消息失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取广场消息失败'
        }
      },
      { status: 500 }
    )
  }
}

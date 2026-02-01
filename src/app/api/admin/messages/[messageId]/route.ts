import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/adminAuth'

// DELETE /api/admin/messages/[messageId] - 删除指定聊天记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const { messageId } = await params

    await prisma.message.delete({
      where: { id: messageId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除聊天记录失败:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '删除聊天记录失败' } },
      { status: 500 }
    )
  }
}

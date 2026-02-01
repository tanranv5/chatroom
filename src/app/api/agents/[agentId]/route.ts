import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminAuth, isAdminRequest } from '@/lib/adminAuth';

type RouteParams = { params: Promise<{ agentId: string }> };

// GET /api/agents/[agentId] - 获取单个智能体
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { agentId } = await params;
    const isAdmin = isAdminRequest(request);

    // 管理员返回全部字段，普通用户只返回安全字段
    const agent = isAdmin
      ? await prisma.agent.findUnique({
          where: { id: agentId },
        })
      : await prisma.agent.findUnique({
          where: { id: agentId },
          select: {
            id: true,
            name: true,
            avatar: true,
            description: true,
            skills: true,
            isActive: true,
            minContentLength: true,
            minReferenceImages: true,
            createdAt: true,
            // 不返回: systemPrompt, policyPrompt, updatedAt
          },
        });

    if (!agent) {
      return NextResponse.json(
        { error: '智能体不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('获取智能体失败:', error);
    return NextResponse.json(
      { error: '获取智能体失败' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[agentId] - 更新智能体
export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const authError = requireAdminAuth(request);
    if (authError) return authError;

    const { agentId } = await params;
    const body = await request.json();
    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        name: body.name,
        avatar: body.avatar,
        description: body.description,
        skills: body.skills,
        systemPrompt: body.systemPrompt,
        policyPrompt: body.policyPrompt,
        isActive: body.isActive,
        minContentLength: typeof body.minContentLength === 'number' ? body.minContentLength : undefined,
        minReferenceImages: typeof body.minReferenceImages === 'number' ? body.minReferenceImages : undefined,
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error('更新智能体失败:', error);
    return NextResponse.json(
      { error: '更新智能体失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[agentId] - 删除智能体
export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const authError = requireAdminAuth(request);
    if (authError) return authError;

    const { agentId } = await params;

    // 先删除关联的消息
    await prisma.message.deleteMany({
      where: { agentId },
    });

    // 再删除智能体
    await prisma.agent.delete({
      where: { id: agentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除智能体失败:', error);
    return NextResponse.json(
      { error: '删除智能体失败' },
      { status: 500 }
    );
  }
}

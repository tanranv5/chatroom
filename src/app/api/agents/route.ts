import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';

// GET /api/agents - 获取所有智能体（公开接口，只返回安全字段）
export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
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
        // 不返回: systemPrompt, policyPrompt
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('获取智能体列表失败:', error);
    return NextResponse.json(
      { error: '获取智能体列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/agents - 创建新智能体
export async function POST(request: Request) {
  try {
    const authError = requireAdminAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const agent = await prisma.agent.create({
      data: {
        name: body.name,
        avatar: body.avatar,
        description: body.description,
        skills: body.skills,
        systemPrompt: body.systemPrompt,
        policyPrompt: body.policyPrompt,
        isActive: body.isActive ?? true,
        minContentLength: typeof body.minContentLength === 'number' ? body.minContentLength : 0,
        minReferenceImages: typeof body.minReferenceImages === 'number' ? body.minReferenceImages : 0,
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error('创建智能体失败:', error);
    return NextResponse.json(
      { error: '创建智能体失败' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_ADMIN_PASSWORD, hashPassword, issueToken } from '@/lib/adminAuth';

// POST /api/admin/login - 登录
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: '请输入密码' },
        { status: 400 }
      );
    }

    // 获取设置
    const settings = await prisma.settings.findUnique({
      where: { id: 'global' }
    });

    // 验证密码
    const hashedInput = hashPassword(password);
    const storedPassword = settings?.adminPassword || '';

    // 如果没有设置密码，使用默认密码
    const isValid = storedPassword
      ? hashedInput === storedPassword
      : password === DEFAULT_ADMIN_PASSWORD;

    if (!isValid) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      );
    }

    // 生成新 token（24小时有效）
    const token = issueToken();

    return NextResponse.json({
      success: true,
      token
    });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/adminAuth';

// GET /api/admin/verify - 验证 token
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    if (!verifyToken(token)) {
      return NextResponse.json(
        { error: '认证令牌无效或已过期' },
        { status: 401 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('验证失败:', error);
    return NextResponse.json(
      { error: '验证失败' },
      { status: 500 }
    );
  }
}

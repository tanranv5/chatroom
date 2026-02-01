import { NextResponse } from 'next/server';
import { hashPassword, requireAdminAuth } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

// GET /api/settings - 获取全局设置
export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 'global' },
    });

    // 如果不存在则创建默认设置
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'global',
          imageApiUrl: '',
          imageApiKey: '',
          imageModel: '',
          speechApiUrl: '',
          speechApiKey: '',
          moderationApiUrl: '',
          moderationApiKey: '',
          moderationModel: '',
          imagebedUrl: '',
          imagebedToken: '',
          adminPassword: '',
          adminTokenSecret: '',
        },
      });
    }

    // 返回时隐藏敏感信息
    return NextResponse.json({
      imageApiUrl: settings.imageApiUrl,
      imageModel: settings.imageModel,
      imageApiKey: settings.imageApiKey ? '••••••' + settings.imageApiKey.slice(-4) : '',
      hasImageApiKey: !!settings.imageApiKey,
      speechApiUrl: settings.speechApiUrl,
      speechApiKey: settings.speechApiKey ? '••••••' + settings.speechApiKey.slice(-4) : '',
      hasSpeechApiKey: !!settings.speechApiKey,
      moderationApiUrl: settings.moderationApiUrl,
      moderationApiKey: settings.moderationApiKey ? '••••••' + settings.moderationApiKey.slice(-4) : '',
      moderationModel: settings.moderationModel,
      hasModerationApiKey: !!settings.moderationApiKey,
      imagebedUrl: settings.imagebedUrl,
      imagebedToken: settings.imagebedToken ? '••••••' + settings.imagebedToken.slice(-4) : '',
      hasImagebedToken: !!settings.imagebedToken,
      hasAdminPassword: !!settings.adminPassword,
    });
  } catch (error) {
    console.error('获取设置失败:', error);
    return NextResponse.json(
      { error: '获取设置失败' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - 更新全局设置
export async function PATCH(request: Request) {
  try {
    const authError = requireAdminAuth(request);
    if (authError) return authError;

    const body = await request.json();

    // 构建更新数据
    const updateData: Record<string, string> = {};

    if (body.imageApiUrl !== undefined) {
      updateData.imageApiUrl = body.imageApiUrl;
    }
    if (body.imageModel !== undefined) {
      updateData.imageModel = body.imageModel;
    }
    if (body.imageApiKey && !body.imageApiKey.startsWith('••••••')) {
      updateData.imageApiKey = body.imageApiKey;
    }
    if (body.speechApiUrl !== undefined) {
      updateData.speechApiUrl = body.speechApiUrl;
    }
    if (body.speechApiKey && !body.speechApiKey.startsWith('••••••')) {
      updateData.speechApiKey = body.speechApiKey;
    }
    if (body.moderationApiUrl !== undefined) {
      updateData.moderationApiUrl = body.moderationApiUrl;
    }
    if (body.moderationApiKey && !body.moderationApiKey.startsWith('••••••')) {
      updateData.moderationApiKey = body.moderationApiKey;
    }
    if (body.moderationModel !== undefined) {
      updateData.moderationModel = body.moderationModel;
    }
    if (body.imagebedUrl !== undefined) {
      updateData.imagebedUrl = body.imagebedUrl;
    }
    if (body.imagebedToken && !body.imagebedToken.startsWith('••••••')) {
      updateData.imagebedToken = body.imagebedToken;
    }
    if (body.adminPassword) {
      updateData.adminPassword = hashPassword(body.adminPassword);
    }

    const settings = await prisma.settings.upsert({
      where: { id: 'global' },
      update: updateData,
      create: {
        id: 'global',
        imageApiUrl: body.imageApiUrl || '',
        imageApiKey: body.imageApiKey || '',
        imageModel: body.imageModel || '',
        speechApiUrl: body.speechApiUrl || '',
        speechApiKey: body.speechApiKey || '',
        moderationApiUrl: body.moderationApiUrl || '',
        moderationApiKey: body.moderationApiKey || '',
        moderationModel: body.moderationModel || '',
        imagebedUrl: body.imagebedUrl || '',
        imagebedToken: body.imagebedToken || '',
        adminPassword: body.adminPassword ? hashPassword(body.adminPassword) : '',
        adminTokenSecret: '',
      },
    });

    return NextResponse.json({
      imageApiUrl: settings.imageApiUrl,
      imageModel: settings.imageModel,
      imageApiKey: settings.imageApiKey ? '••••••' + settings.imageApiKey.slice(-4) : '',
      hasImageApiKey: !!settings.imageApiKey,
      speechApiUrl: settings.speechApiUrl,
      speechApiKey: settings.speechApiKey ? '••••••' + settings.speechApiKey.slice(-4) : '',
      hasSpeechApiKey: !!settings.speechApiKey,
      moderationApiUrl: settings.moderationApiUrl,
      moderationApiKey: settings.moderationApiKey ? '••••••' + settings.moderationApiKey.slice(-4) : '',
      moderationModel: settings.moderationModel,
      hasModerationApiKey: !!settings.moderationApiKey,
      imagebedUrl: settings.imagebedUrl,
      imagebedToken: settings.imagebedToken ? '••••••' + settings.imagebedToken.slice(-4) : '',
      hasImagebedToken: !!settings.imagebedToken,
      hasAdminPassword: !!settings.adminPassword,
    });
  } catch (error) {
    console.error('更新设置失败:', error);
    return NextResponse.json(
      { error: '更新设置失败' },
      { status: 500 }
    );
  }
}

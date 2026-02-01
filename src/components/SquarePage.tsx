'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SquareMessage {
  id: string;
  userId: string;
  content: string;
  imageData: string | null;
  referenceImages: string[] | null;
  type: string;
  userNickname: string;
  userIp: string;
  agentName: string;
  agentAvatar: string;
  timestamp: Date;
  generationTime: number | null;
}

export default function SquarePage() {
  const [messages, setMessages] = useState<SquareMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<SquareMessage[][]>([[], []]);
  const [selectedMessage, setSelectedMessage] = useState<SquareMessage | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    fetchSquareMessages();
  }, []);

  // 瀑布流布局算法 - 只显示有图片的消息
  useEffect(() => {
    // 过滤出有图片的消息
    const messagesWithImages = messages.filter(msg => msg.imageData && msg.imageData.trim() !== '');

    if (messagesWithImages.length === 0) {
      setColumns([[], []]);
      return;
    }

    // 初始化两列
    const col1: SquareMessage[] = [];
    const col2: SquareMessage[] = [];

    // 简单的交替分配策略（实际应该根据图片高度）
    messagesWithImages.forEach((msg, index) => {
      if (index % 2 === 0) {
        col1.push(msg);
      } else {
        col2.push(msg);
      }
    });

    setColumns([col1, col2]);
  }, [messages]);

  const fetchSquareMessages = async () => {
    try {
      const response = await fetch('/api/square?limit=100');
      const data = await response.json();

      if (data.success) {
        setMessages(data.data.messages);
      }
    } catch (error) {
      console.error('获取广场消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (avatar: string, name: string) => {
    const trimmedAvatar = avatar?.trim();
    if (
      trimmedAvatar &&
      (trimmedAvatar.startsWith('http://') ||
        trimmedAvatar.startsWith('https://') ||
        trimmedAvatar.startsWith('/') ||
        trimmedAvatar.startsWith('data:') ||
        trimmedAvatar.startsWith('blob:'))
    ) {
      return trimmedAvatar;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
  };

  // 计算有图片的消息数量
  const messagesWithImagesCount = columns[0].length + columns[1].length;

  // 格式化时间
  const formatTime = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div style={{ color: 'var(--label-secondary)' }}>加载中...</div>
      </div>
    );
  }

  if (messages.length === 0 || messagesWithImagesCount === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center p-8"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <svg
          className="w-20 h-20 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: 'var(--system-gray3)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm" style={{ color: 'var(--label-tertiary)' }}>广场还没有作品</p>
        <p className="text-xs mt-2" style={{ color: 'var(--label-quaternary)' }}>发送消息时选择"发到广场"即可分享</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* 瀑布流布局 */}
      <div className="p-2 flex gap-2">
        {/* 左列 */}
        <div className="flex-1 flex flex-col gap-2">
          {columns[0].map((msg) => (
            <div
              key={msg.id}
              className="relative rounded-xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: 'var(--bg-primary)' }}
              onClick={() => setSelectedMessage(msg)}
            >
              {/* 图片 */}
              <div className="w-full relative">
                <img
                  src={msg.imageData!}
                  alt={msg.content}
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* 底部信息栏 */}
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
                    style={{ background: 'var(--system-gray5)' }}
                  >
                    <Image
                      src={getAvatarUrl(msg.agentAvatar, msg.agentName)}
                      alt={msg.agentName}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs truncate"
                      style={{ color: 'var(--label-secondary)' }}
                    >
                      {msg.agentName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 右列 */}
        <div className="flex-1 flex flex-col gap-2">
          {columns[1].map((msg) => (
            <div
              key={msg.id}
              className="relative rounded-xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
              style={{ background: 'var(--bg-primary)' }}
              onClick={() => setSelectedMessage(msg)}
            >
              {/* 图片 */}
              <div className="w-full relative">
                <img
                  src={msg.imageData!}
                  alt={msg.content}
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* 底部信息栏 */}
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
                    style={{ background: 'var(--system-gray5)' }}
                  >
                    <Image
                      src={getAvatarUrl(msg.agentAvatar, msg.agentName)}
                      alt={msg.agentName}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs truncate"
                      style={{ color: 'var(--label-secondary)' }}
                    >
                      {msg.agentName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部统计 */}
      <div className="py-4 text-center">
        <p className="text-xs" style={{ color: 'var(--label-tertiary)' }}>{messagesWithImagesCount} 个作品</p>
      </div>

      {/* 图片详情弹窗 */}
      {selectedMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ background: 'var(--bg-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setSelectedMessage(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full"
              style={{
                background: 'var(--system-gray5)',
                color: 'var(--label-secondary)'
              }}
              aria-label="关闭"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 详情信息 */}
            <div className="p-4 space-y-3">
              {/* 用户需求 - 完整显示 */}
              <div>
                <p
                  className="text-xs mb-1"
                  style={{ color: 'var(--label-tertiary)' }}
                >
                  用户需求
                </p>
                <p
                  className="text-[15px] leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--label-primary)' }}
                >
                  {selectedMessage.content}
                </p>
              </div>

              {/* 用户参考图片 */}
              {selectedMessage.referenceImages && selectedMessage.referenceImages.length > 0 && (
                <div>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--label-tertiary)' }}
                  >
                    参考图片
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedMessage.referenceImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-lg overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
                        style={{ background: 'var(--system-gray6)' }}
                        onClick={() => setFullScreenImage(img)}
                      >
                        <img
                          src={img}
                          alt={`参考图 ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 分隔线 */}
              <div style={{ borderTop: '1px solid var(--separator)' }} />

              {/* AI 生成的图片 */}
              <div>
                <p
                  className="text-xs mb-2"
                  style={{ color: 'var(--label-tertiary)' }}
                >
                  AI 创作
                </p>
                <img
                  src={selectedMessage.imageData!}
                  alt={selectedMessage.content}
                  className="w-full h-auto rounded-xl cursor-pointer active:opacity-80 transition-opacity"
                  onClick={() => setFullScreenImage(selectedMessage.imageData!)}
                />
              </div>

              {/* 分隔线 */}
              <div style={{ borderTop: '1px solid var(--separator)' }} />

              {/* 创作信息 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                    style={{ background: 'var(--system-gray5)' }}
                  >
                    <Image
                      src={getAvatarUrl(selectedMessage.agentAvatar, selectedMessage.agentName)}
                      alt={selectedMessage.agentName}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: 'var(--label-primary)' }}
                    >
                      {selectedMessage.agentName}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--label-tertiary)' }}
                    >
                      画师
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-xs"
                    style={{ color: 'var(--label-secondary)' }}
                  >
                    {formatTime(selectedMessage.timestamp)}
                  </p>
                  {selectedMessage.generationTime && (
                    <p
                      className="text-xs"
                      style={{ color: 'var(--label-tertiary)' }}
                    >
                      耗时 {(selectedMessage.generationTime / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              </div>

              {/* 用户信息 */}
              <div
                className="flex items-center justify-between text-xs pt-2"
                style={{
                  color: 'var(--label-tertiary)',
                  borderTop: '1px solid var(--separator)'
                }}
              >
                <span>创作者：{selectedMessage.userNickname}</span>
                <span>IP：{selectedMessage.userIp}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全屏图片查看器 */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.95)' }}
          onClick={() => setFullScreenImage(null)}
        >
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF'
            }}
            aria-label="关闭"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={fullScreenImage}
            alt="放大查看"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

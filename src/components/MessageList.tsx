'use client';

import { useRef, useEffect } from 'react';
import { Message } from '@/types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息时自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 格式化日期分隔符
  const formatDateSeparator = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((today.getTime() - messageDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[d.getDay()];
    } else {
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    }
  };

  // 判断是否需要显示日期分隔符
  const shouldShowDateSeparator = (current: Message, previous?: Message) => {
    if (!previous) return true;
    const currentDate = new Date(current.timestamp);
    const previousDate = new Date(previous.timestamp);
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  // 判断是否需要显示时间（消息间隔超过5分钟）
  const shouldShowTime = (current: Message, previous?: Message) => {
    if (!previous) return true;
    const currentTime = new Date(current.timestamp).getTime();
    const previousTime = new Date(previous.timestamp).getTime();
    return currentTime - previousTime > 5 * 60 * 1000; // 5分钟
  };

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto scrollbar-hide"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* 顶部空间 */}
      <div className="h-3" />

      {messages.map((message, index) => {
        const previousMessage = messages[index - 1];
        const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
        const showTime = shouldShowTime(message, previousMessage);
        const isOwn = message.sender === 'user';

        return (
          <div key={message.id}>
            {/* 日期分隔符 */}
            {showDateSeparator && (
              <div className="flex justify-center py-3">
                <span
                  className="text-xs px-3 py-1 rounded-full"
                  style={{
                    color: 'var(--label-secondary)',
                    background: 'var(--system-gray5)'
                  }}
                >
                  {formatDateSeparator(message.timestamp)}
                </span>
              </div>
            )}

            {/* 时间分隔符（同一天但间隔较长） */}
            {!showDateSeparator && showTime && (
              <div className="flex justify-center py-2">
                <span className="text-xs" style={{ color: 'var(--label-tertiary)' }}>
                  {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}

            {/* 消息气泡 */}
            <MessageBubble message={message} isOwn={isOwn} />
          </div>
        );
      })}

      {/* 空状态提示 */}
      {messages.length === 0 && (
        <div
          className="flex flex-col items-center justify-center h-full"
          style={{ color: 'var(--label-tertiary)' }}
        >
          <div
            className="w-20 h-20 mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'var(--system-gray5)' }}
          >
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--label-tertiary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm">发送消息，AI 将为你创作图片</p>
          <p className="text-xs mt-1" style={{ color: 'var(--label-quaternary)' }}>试试描述一个场景或物体吧~</p>
        </div>
      )}

      {/* 底部锚点 */}
      <div ref={bottomRef} className="h-3" />
    </div>
  );
}

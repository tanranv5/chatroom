'use client';

import { useState, useCallback, useEffect } from 'react';
import { Message } from '@/types';
import { Agent } from '@/components/AgentList';
import ChatHeader from '@/components/ChatHeader';
import MessageList from '@/components/MessageList';
import ChatInput from '@/components/ChatInput';

interface ChatRoomProps {
  agent: Agent;
  onBack: () => void;
}

export default function ChatRoom({ agent, onBack }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string } | null>(null);

  type ApiMessage = {
    id: string;
    userId: string;
    content: string;
    imageData?: string | null;
    referenceImages?: string[] | null;
    type: 'text' | 'image';
    sender: 'user' | 'ai';
    senderName: string;
    senderAvatar: string;
    timestamp: string;
    generationTime?: number | null;
    isPublishedToSquare?: boolean;
  };

  // 加载历史消息（开发环境 StrictMode 可能会触发一次“取消”是正常现象，第二次会重新拉取）
  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(`/api/agents/${agent.id}/messages?limit=50`, { signal: controller.signal });
        const data = await response.json();

        if (data.success && data.data?.messages) {
          const formattedMessages: Message[] = (data.data.messages as ApiMessage[]).map((msg) => ({
            id: msg.id,
            content: msg.content,
            imageUrl: msg.imageData ?? undefined,
            referenceImages: Array.isArray(msg.referenceImages) ? msg.referenceImages : undefined,
            type: msg.type,
            sender: msg.sender,
            senderName: msg.senderName,
            senderAvatar: msg.senderAvatar,
            timestamp: new Date(msg.timestamp),
            generationTime: msg.generationTime ?? undefined,
            isPublishedToSquare: msg.isPublishedToSquare,
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('加载消息失败:', error);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [agent.id]);

  // 智能体信息变更时，同步刷新已渲染的 AI 消息头像/昵称（避免出现旧头像）
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.sender !== 'ai') return m;
        return { ...m, senderName: agent.name, senderAvatar: agent.avatar };
      })
    );
  }, [agent.name, agent.avatar]);

  // 获取当前用户（根据 IP 识别）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/user');
        const data = await resp.json();
        if (!cancelled && data?.success && data?.data?.id) {
          setCurrentUser({
            id: data.data.id,
            name: data.data.nickname || '我',
            avatar: data.data.avatar || '',
          });
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 发送消息
  const handleSend = useCallback(async (content: string, referenceImages?: string[], publishToSquare?: boolean) => {
    const minContent = agent.minContentLength ?? 0;
    const minRef = agent.minReferenceImages ?? 0;
    const trimmed = content.trim();

    if (minContent > 0 && trimmed.length < minContent) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: `发送失败：需要至少 ${minContent} 个字`,
        type: 'text',
        sender: 'ai',
        senderName: agent.name,
        senderAvatar: agent.avatar,
        timestamp: new Date(),
      }]);
      return;
    }

    const refCount = referenceImages?.length || 0;
    if (refCount > 0 && refCount < minRef) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: `发送失败：该智能体需要至少 ${minRef} 张参考图`,
        type: 'text',
        sender: 'ai',
        senderName: agent.name,
        senderAvatar: agent.avatar,
        timestamp: new Date(),
      }]);
      return;
    }

    const maxImages = Math.max(minRef || 0, 5);
    const imagesToSend = referenceImages?.slice(0, maxImages);
    setIsGenerating(true);

    // 确保当前用户已加载（用于发送消息的昵称/头像显示）
    let effectiveUser = currentUser;
    if (!effectiveUser) {
      try {
        const resp = await fetch('/api/user');
        const data = await resp.json();
        if (data?.success && data?.data?.id) {
          effectiveUser = {
            id: data.data.id,
            name: data.data.nickname || '本地用户',
            avatar: data.data.avatar || '',
          };
          setCurrentUser(effectiveUser);
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    }

    // 添加 AI 加载中消息
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      content: '',
      type: 'loading',
      sender: 'ai',
      senderName: agent.name,
      senderAvatar: agent.avatar,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      // 调用消息保存和生成 API（使用 SSE 流式响应）
      const response = await fetch(`/api/agents/${agent.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          referenceImages: imagesToSend,
          publishToSquare: publishToSquare || false
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message = errorPayload?.error?.message || '发送消息失败';
        throw new Error(message);
      }

      // 处理 SSE 流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)\ndata: (.+)$/);
          if (!eventMatch) continue;

          const [, event, dataStr] = eventMatch;
          const data = JSON.parse(dataStr);

          switch (event) {
            case 'user-message':
              // 添加用户消息
              setMessages(prev => {
                const filtered = prev.filter(m => m.id !== loadingMessage.id);
                return [...filtered, {
                  id: data.id,
                  content,
                  referenceImages: imagesToSend,
                  type: imagesToSend && imagesToSend.length > 0 ? 'image' : 'text',
                  sender: 'user',
                  senderName: effectiveUser?.name || '本地用户',
                  senderAvatar: effectiveUser?.avatar || '',
                  timestamp: new Date(data.timestamp),
                }, loadingMessage];
              });
              break;

            case 'step':
              // 后端步骤事件：仅用于调试
              console.debug('[SSE step]', data);
              break;

            case 'generating':
              // 后端状态事件：仅用于调试（UI 目前用 loading 气泡表达）
              console.debug('[SSE generating]', data);
              break;

            case 'ai-message':
              // 移除加载消息，添加 AI 响应
              setMessages(prev => {
                const filtered = prev.filter(m => m.id !== loadingMessage.id);
                return [...filtered, {
                  id: data.id,
                  content: data.content,
                  imageUrl: data.imageData,
                  type: 'image',
                  sender: 'ai',
                  senderName: agent.name,
                  senderAvatar: agent.avatar,
                  timestamp: new Date(data.timestamp),
                }];
              });
              break;

            case 'error':
              throw new Error(data.message);
          }
        }
      }
    } catch (error) {
      console.error('生成失败:', error);
      // 移除加载消息，显示错误
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingMessage.id);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          content: '生成失败',
          type: 'text',
          sender: 'ai',
          senderName: agent.name,
          senderAvatar: agent.avatar,
          timestamp: new Date(),
        };
        return [...filtered, errorMessage];
      });
    } finally {
      setIsGenerating(false);
    }
  }, [agent, currentUser]);

  return (
    <div
      className="h-screen flex flex-col max-w-md mx-auto shadow-2xl"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* 顶部导航栏 */}
      <ChatHeader
        name={agent.name}
        avatar={agent.avatar}
        onBack={onBack}
      />

      {/* 消息列表 */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div style={{ color: 'var(--label-secondary)' }}>加载中...</div>
        </div>
      ) : (
        <MessageList
          messages={messages}
          currentUserId={currentUser?.id || ''}
        />
      )}

      {/* 底部输入框 */}
      <ChatInput
        onSend={handleSend}
        disabled={isGenerating}
        minContentLength={agent.minContentLength}
        minReferenceImages={agent.minReferenceImages}
      />
    </div>
  );
}

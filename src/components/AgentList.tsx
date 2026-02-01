'use client';

import Image from 'next/image';
import { useSyncExternalStore } from 'react';

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  description: string;
  skills: string;
  minContentLength?: number;
  minReferenceImages?: number;
  lastMessage?: string;
  lastTime?: Date;
  unreadCount?: number;
  online?: boolean;
}

interface AgentListProps {
  agents: Agent[];
  onSelectAgent: (agent: Agent) => void;
}

/**
 * Apple HIG Compliant Agent List
 *
 * Design Decisions:
 * - Minimum 44px row height for touch targets
 * - Circular avatars following iOS style
 * - Inset separators starting after avatar
 * - System Red for unread badges
 * - Subtle hover/active states
 */
export default function AgentList({ agents, onSelectAgent }: AgentListProps) {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const getAvatarUrl = (agent: Agent) => {
    const avatar = agent.avatar?.trim();
    const isPlaceholder = avatar === '/ai-avatar.svg' || avatar === '/user-avatar.svg';

    if (avatar && avatar !== '' && !isPlaceholder) {
      if (avatar.length <= 4 && !/[\/.]/.test(avatar)) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=random&size=128`;
      }

      if (
        avatar.startsWith('http://') ||
        avatar.startsWith('https://') ||
        avatar.startsWith('/') ||
        avatar.startsWith('data:') ||
        avatar.startsWith('blob:')
      ) {
        return avatar;
      }
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=random&size=128`;
  };

  const formatTime = (date?: Date) => {
    if (!date || !isHydrated) return '';
    const d = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((today.getTime() - messageDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[d.getDay()];
    } else {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto scrollbar-hide"
      style={{ background: 'var(--bg-primary)' }}
    >
      {agents.map((agent) => (
        <div
          key={agent.id}
          onClick={() => onSelectAgent(agent)}
          className="flex items-center gap-3 px-4 cursor-pointer transition-colors"
          style={{
            minHeight: '72px',
            borderBottom: '0.5px solid var(--separator)'
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelectAgent(agent)}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div
              className="w-12 h-12 rounded-full overflow-hidden"
              style={{ background: 'var(--system-gray5)' }}
            >
              <Image
                src={getAvatarUrl(agent)}
                alt={agent.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 py-3">
            <div className="flex items-center justify-between mb-1">
              <h3
                className="font-medium text-[16px] truncate"
                style={{ color: 'var(--label-primary)' }}
              >
                {agent.name}
              </h3>
            </div>
            <p
              className="text-sm truncate"
              style={{ color: 'var(--label-secondary)' }}
            >
              {agent.description}
            </p>
          </div>

          {/* 右箭头指示器 */}
          <div className="flex-shrink-0" style={{ color: 'var(--label-quaternary)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}

      {/* Empty State */}
      {agents.length === 0 && (
        <div
          className="flex flex-col items-center justify-center h-64"
          style={{ color: 'var(--label-tertiary)' }}
        >
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-sm">暂无创作大师</p>
        </div>
      )}
    </div>
  );
}

'use client';

import Image from 'next/image';
import { Agent } from './AgentList';

interface AgentProfileProps {
  agent: Agent;
  onBack: () => void;
  onStartChat: () => void;
}

export default function AgentProfile({ agent, onBack, onStartChat }: AgentProfileProps) {
  // 获取有效的头像 URL
  const getAvatarUrl = (agent: Agent) => {
    const avatar = agent.avatar?.trim();

    // 检查是否为有效的URL或路径
    if (avatar && avatar !== '') {
      // 检查是否为emoji或其他非URL字符
      // emoji通常是单个字符或几个字符,且不包含/或.
      if (avatar.length <= 4 && !/[\/.]/.test(avatar)) {
        // 这可能是emoji,使用默认头像
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=random&size=128`;
      }

      // 检查是否为有效的URL格式 (http/https) 或本地路径 (/)
      if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/')) {
        return avatar;
      }
    }

    // 如果头像无效，生成默认头像
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=random&size=128`;
  };

  return (
    <div
      className="h-screen flex flex-col max-w-md mx-auto shadow-2xl"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* 顶部导航栏 */}
      <div
        className="border-b px-4 py-3 safe-area-top"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--separator)'
        }}
      >
        <div className="flex items-center justify-between">
          {/* 返回按钮 */}
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center -ml-2 btn-press"
            style={{ color: 'var(--system-green)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 标题 */}
          <h1
            className="font-semibold text-[17px]"
            style={{ color: 'var(--label-primary)' }}
          >
            资料
          </h1>

          {/* 右侧占位 */}
          <div className="w-8 h-8"></div>
        </div>
      </div>

      {/* 资料内容 */}
      <div className="flex-1 overflow-y-auto">
        {/* 头像和基本信息 */}
        <div className="px-4 py-6" style={{ background: 'var(--bg-primary)' }}>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-lg overflow-hidden"
              style={{ background: 'var(--system-gray5)' }}
            >
              <Image
                src={getAvatarUrl(agent)}
                alt={agent.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h2
                className="text-xl font-medium"
                style={{ color: 'var(--label-primary)' }}
              >
                {agent.name}
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--label-secondary)' }}
              >
                专业创作
              </p>
            </div>
          </div>
        </div>

        {/* 介绍和特长 */}
        <div
          className="mt-2 px-4 py-4 space-y-4"
          style={{ background: 'var(--bg-primary)' }}
        >
          {/* 介绍 */}
          <div className="flex items-start gap-3">
            <span
              className="text-sm w-16 flex-shrink-0"
              style={{ color: 'var(--label-secondary)' }}
            >
              介绍
            </span>
            <p
              className="flex-1 text-sm leading-relaxed"
              style={{ color: 'var(--label-primary)' }}
            >
              {agent.description}
            </p>
          </div>

          {/* 特长 */}
          <div className="flex items-start gap-3">
            <span
              className="text-sm w-16 flex-shrink-0"
              style={{ color: 'var(--label-secondary)' }}
            >
              特长
            </span>
            <div className="flex-1">
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--label-primary)' }}
              >
                {agent.skills}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div
        className="border-t px-4 py-3 safe-area-bottom"
        style={{
          background: 'var(--bg-primary)',
          borderColor: 'var(--separator)'
        }}
      >
        <button
          onClick={onStartChat}
          className="w-full h-11 text-white rounded-lg font-medium active:opacity-80 transition-opacity"
          style={{ background: 'var(--system-green)' }}
        >
          发消息
        </button>
      </div>
    </div>
  );
}

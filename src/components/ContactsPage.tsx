'use client';

import Image from 'next/image';
import { Agent } from './AgentList';
import SearchBar from '@/components/SearchBar';
import { useMemo, useState } from 'react';

interface ContactsPageProps {
  agents: Agent[];
  onSelectAgent: (agent: Agent) => void;
}

export default function ContactsPage({ agents, onSelectAgent }: ContactsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 获取有效的头像 URL
  const getAvatarUrl = (agent: Agent) => {
    const avatar = agent.avatar?.trim();
    const isPlaceholder = avatar === '/ai-avatar.svg' || avatar === '/user-avatar.svg';

    // 检查是否为有效的URL或路径
    if (avatar && avatar !== '' && !isPlaceholder) {
      // 检查是否为emoji或其他非URL字符
      // emoji通常是单个字符或几个字符,且不包含/或.
      if (avatar.length <= 4 && !/[\/.]/.test(avatar)) {
        // 这可能是emoji,使用默认头像
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=random&size=128`;
      }

      // 检查是否为有效的URL格式 (http/https) 或本地路径 (/) 或 data/blob
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

    // 如果头像无效，生成默认头像
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=random&size=128`;
  };

  const filteredAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return agents;
    return agents.filter((agent) => {
      return (
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query)
      );
    });
  }, [agents, searchQuery]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#EDEDED]">
      {/* 搜索框 */}
      <div className="px-4 py-3 bg-[#EDEDED]">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="搜索" />
      </div>

      {/* 智能体列表 */}
      <div className="bg-white">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 active:bg-gray-50 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-200">
              <Image
                src={getAvatarUrl(agent)}
                alt={agent.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h4 className="text-[15px] text-gray-900">{agent.name}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{agent.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 底部统计 */}
      <div className="py-4 text-center">
        <p className="text-xs text-gray-400">{filteredAgents.length} 位创作大师</p>
      </div>
    </div>
  );
}

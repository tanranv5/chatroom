'use client';

import { useState, useEffect } from 'react';
import ListHeader from '@/components/ListHeader';
import AgentList, { Agent } from '@/components/AgentList';
import TabBar from '@/components/TabBar';
import ChatRoom from '@/components/ChatRoom';
import SquarePage from '@/components/SquarePage';
import ProfilePage from '@/components/ProfilePage';
import AgentProfile from '@/components/AgentProfile';


// Tab 标题映射
const TAB_TITLES: Record<string, string> = {
  chat: '创作助手',
  square: '广场',
  me: '我',
};

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'profile' | 'chat'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // 从数据库加载智能体列表
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data: unknown = await response.json();

      const records: Record<string, unknown>[] = Array.isArray(data)
        ? (data.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null))
        : [];

      // 转换数据格式，只显示激活的智能体
      const formattedAgents: Agent[] = records
        .filter((agent) => agent.isActive === true)
        .map((agent) => ({
          id: typeof agent.id === 'string' ? agent.id : '',
          name: typeof agent.name === 'string' ? agent.name : '',
          // 头像为空时交由组件统一回退到 ui-avatars，避免强行写死本地默认头像
          avatar: typeof agent.avatar === 'string' ? agent.avatar : '',
          description: typeof agent.description === 'string' ? agent.description : '',
          minContentLength: typeof agent.minContentLength === 'number' ? agent.minContentLength : 0,
          minReferenceImages: typeof agent.minReferenceImages === 'number' ? agent.minReferenceImages : 0,
          skills: typeof agent.skills === 'string' ? agent.skills : '',
          systemPrompt: typeof agent.systemPrompt === 'string' ? agent.systemPrompt : '',
          lastMessage: '',
          lastTime: undefined,
          unreadCount: 0,
          online: true,
        }));
      setAgents(formattedAgents);
    } catch (error) {
      console.error('加载智能体失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 从通讯录进入资料页
  const handleViewProfile = (agent: Agent) => {
    setSelectedAgent(agent);
    setViewMode('profile');
  };

  // 从资料页进入聊天
  const handleStartChat = () => {
    setViewMode('chat');
  };

  // 从聊天列表直接进入聊天
  const handleSelectAgentFromList = (agent: Agent) => {
    setSelectedAgent(agent);
    setViewMode('chat');
  };

  // 返回列表
  const handleBack = () => {
    setSelectedAgent(null);
    setViewMode('list');
  };

  // 过滤智能体列表
  const filteredAgents = agents.filter((agent) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.description.toLowerCase().includes(query)
    );
  });

  // 显示资料页面
  if (selectedAgent && viewMode === 'profile') {
    return (
      <main className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
        <AgentProfile
          agent={selectedAgent}
          onBack={handleBack}
          onStartChat={handleStartChat}
        />
      </main>
    );
  }

  // 显示聊天室
  if (selectedAgent && viewMode === 'chat') {
    return (
      <main className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
        <ChatRoom
          agent={selectedAgent}
          onBack={handleBack}
        />
      </main>
    );
  }

  // 渲染当前 Tab 内容
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div style={{ color: 'var(--label-secondary)' }}>加载中...</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'chat':
        return (
          <AgentList
            agents={filteredAgents}
            onSelectAgent={handleSelectAgentFromList}
          />
        );
      case 'square':
        return <SquarePage />;
      case 'me':
        return <ProfilePage />;
      default:
        return null;
    }
  };

  // 显示主页面
  return (
    <main className="min-h-screen overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      <div
        className="h-screen flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* 顶部标题栏 - 根据 Tab 显示不同内容 */}
        <ListHeader
          title={TAB_TITLES[activeTab]}
          showSearch={activeTab === 'chat'}
          showAdd={activeTab === 'chat'}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Tab 内容区域 */}
        {renderTabContent()}

        {/* 底部 Tab 栏 */}
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </main>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  avatar: string;
  description: string;
  skills: string;
  systemPrompt: string;
  policyPrompt?: string;
  minContentLength?: number;
  minReferenceImages?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Settings {
  imageApiUrl: string;
  imageApiKey: string;
  imageModel: string;
  hasImageApiKey: boolean;
  speechApiUrl: string;
  speechApiKey: string;
  hasSpeechApiKey: boolean;
  moderationApiUrl: string;
  moderationApiKey: string;
  moderationModel: string;
  hasModerationApiKey: boolean;
  imagebedUrl: string;
  imagebedToken: string;
  hasImagebedToken: boolean;
  adminPassword?: string;
  hasAdminPassword?: boolean;
}

const PAGE_SIZE = 10;

export default function AdminPage() {
  // 认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 数据状态
  const [agents, setAgents] = useState<Agent[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // 编辑状态
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingSettings, setEditingSettings] = useState<Settings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [polishingAgent, setPolishingAgent] = useState(false);
  const [polishError, setPolishError] = useState('');

  // 检查登录状态
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      verifyToken(token);
    } else {
      setCheckingAuth(false);
    }
  }, []);

  // 验证 token
  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setIsAuthenticated(true);
        fetchAgents();
        fetchSettings();
      } else {
        localStorage.removeItem('admin_token');
      }
    } catch {
      localStorage.removeItem('admin_token');
    } finally {
      setCheckingAuth(false);
    }
  };

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('admin_token', data.token);
        setIsAuthenticated(true);
        setPassword('');
        fetchAgents();
        fetchSettings();
      } else {
        setAuthError(data.error || '密码错误');
      }
    } catch {
      setAuthError('登录失败，请重试');
    }
  };

  // 登出
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setAgents([]);
    setSettings(null);
  };

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/agents', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('加载智能体失败:', error);
      alert('加载智能体失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/settings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  // 过滤和分页
  const filteredAgents = useMemo(() => {
    if (!searchTerm) return agents;
    const term = searchTerm.toLowerCase();
    return agents.filter(agent =>
      agent.name.toLowerCase().includes(term) ||
      agent.description.toLowerCase().includes(term)
    );
  }, [agents, searchTerm]);

  const totalPages = Math.ceil(filteredAgents.length / PAGE_SIZE);
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAgents.slice(start, start + PAGE_SIZE);
  }, [filteredAgents, currentPage]);

  // 搜索时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const toggleActive = async (agent: Agent) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/agents/' + agent.id, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ isActive: !agent.isActive }),
      });
      if (response.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('确定要删除这个智能体吗?')) return;
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/agents/' + id, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsCreating(false);
    setPolishError('');
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingAgent({
      id: '',
      name: '',
      avatar: '🤖',
      description: '',
      skills: '',
      systemPrompt: '',
      policyPrompt: '',
      minContentLength: 0,
      minReferenceImages: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsCreating(true);
    setPolishError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingAgent) return;
    try {
      const token = localStorage.getItem('admin_token');

      if (isCreating) {
        // 创建新智能体
        const response = await fetch('/api/agents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            name: editingAgent.name,
            avatar: editingAgent.avatar,
            description: editingAgent.description,
            skills: editingAgent.skills,
            systemPrompt: editingAgent.systemPrompt,
            policyPrompt: editingAgent.policyPrompt,
            minContentLength: Number(editingAgent.minContentLength) || 0,
            minReferenceImages: Number(editingAgent.minReferenceImages) || 0,
            isActive: editingAgent.isActive,
          }),
        });
        if (response.ok) {
          setShowModal(false);
          setEditingAgent(null);
          setIsCreating(false);
          fetchAgents();
        }
      } else {
        // 更新现有智能体
        const response = await fetch('/api/agents/' + editingAgent.id, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            name: editingAgent.name,
            avatar: editingAgent.avatar,
            description: editingAgent.description,
            skills: editingAgent.skills,
            systemPrompt: editingAgent.systemPrompt,
            policyPrompt: editingAgent.policyPrompt,
            minContentLength: Number(editingAgent.minContentLength) || 0,
            minReferenceImages: Number(editingAgent.minReferenceImages) || 0,
            isActive: editingAgent.isActive,
          }),
        });
        if (response.ok) {
          setShowModal(false);
          setEditingAgent(null);
          fetchAgents();
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const handlePolishAgent = async () => {
    if (!editingAgent) return;
    const systemPrompt = editingAgent.systemPrompt?.trim();
    if (!systemPrompt) {
      setPolishError('请先填写系统提示词，再进行 AI 润色');
      return;
    }

    setPolishingAgent(true);
    setPolishError('');

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/agents/polish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: editingAgent.name,
          systemPrompt: editingAgent.systemPrompt,
          description: editingAgent.description,
          skills: editingAgent.skills,
          policyPrompt: editingAgent.policyPrompt || ''
        })
      });

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        setAuthError('登录已过期，请重新登录');
        handleLogout();
        return;
      }

      if (!response.ok || !data?.success) {
        setPolishError(data?.error?.message || '润色失败，请检查审核模型配置');
        return;
      }

      setEditingAgent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          name: data.data.name || prev.name,
          description: data.data.description ?? prev.description,
          skills: data.data.skills ?? prev.skills,
          policyPrompt: data.data.policyPrompt ?? prev.policyPrompt,
        };
      });
    } catch (error) {
      console.error('润色失败:', error);
      setPolishError('润色失败，请重试');
    } finally {
      setPolishingAgent(false);
    }
  };

  const handleEditSettings = () => {
    if (settings) {
      setEditingSettings({
        ...settings,
        imageApiKey: '',
        speechApiKey: '',
        moderationApiKey: '',
        imagebedToken: '',
        adminPassword: ''
      });
      setShowSettingsModal(true);
    }
  };

  const handleSaveSettings = async () => {
    if (!editingSettings) return;
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(editingSettings),
      });
      if (response.ok) {
        setShowSettingsModal(false);
        setEditingSettings(null);
        fetchSettings();
        alert('设置保存成功！');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存设置失败');
    } finally {
      setSavingSettings(false);
    }
  };

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

  // 检查认证中
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">验证中...</div>
      </div>
    );
  }

  // 未登录显示登录页
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">后台管理</h1>
            <p className="text-gray-500 mt-2">请输入管理密码</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="管理密码"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                autoFocus
              />
            </div>

            {authError && (
              <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              登录
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-indigo-600 hover:text-indigo-800 text-sm">
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 顶部标题栏 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">智能体管理</h1>
              <p className="text-gray-600 mt-2">共 {agents.length} 个智能体</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
              >
                <span>➕</span>
                <span>添加智能体</span>
              </button>
              <Link
                href="/admin/messages"
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
              >
                聊天记录管理
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                返回首页
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>

        {/* 全局 API 设置卡片 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">🔧 全局设置</h2>
            <button
              onClick={handleEditSettings}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              编辑设置
            </button>
          </div>
          {settings && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">图片 API 端点</div>
                <div className="font-mono text-sm truncate">{settings.imageApiUrl}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">图片模型</div>
                <div className="font-mono text-sm">{settings.imageModel}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">图片 API 密钥</div>
                <div className="font-mono text-sm">
                  {settings.hasImageApiKey ? (
                    <span className="text-green-600">✓ 已配置 ({settings.imageApiKey})</span>
                  ) : (
                    <span className="text-red-600">✗ 未配置</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">语音 API 端点</div>
                <div className="font-mono text-sm truncate">{settings.speechApiUrl}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">语音 API 密钥</div>
                <div className="font-mono text-sm">
                  {settings.hasSpeechApiKey ? (
                    <span className="text-green-600">✓ 已配置 ({settings.speechApiKey})</span>
                  ) : (
                    <span className="text-red-600">✗ 未配置</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">管理密码</div>
                <div className="font-mono text-sm">
                  {settings.hasAdminPassword ? (
                    <span className="text-green-600">✓ 已设置</span>
                  ) : (
                    <span className="text-yellow-600">⚠ 使用默认密码</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">审核模型端点</div>
                <div className="font-mono text-sm truncate">{settings.moderationApiUrl || '未配置'}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">审核模型</div>
                <div className="font-mono text-sm">{settings.moderationModel || '未设置'}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">审核密钥</div>
                <div className="font-mono text-sm">
                  {settings.hasModerationApiKey ? (
                    <span className="text-green-600">✓ 已配置 ({settings.moderationApiKey})</span>
                  ) : (
                    <span className="text-red-600">✗ 未配置</span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">图床地址</div>
                <div className="font-mono text-sm truncate">{settings.imagebedUrl || '未配置'}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">图床 Token</div>
                <div className="font-mono text-sm">
                  {settings.hasImagebedToken ? (
                    <span className="text-green-600">✓ 已配置 ({settings.imagebedToken})</span>
                  ) : (
                    <span className="text-red-600">✗ 未配置</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 搜索和分页控制 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索智能体名称或描述..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>显示 {filteredAgents.length} 个结果</span>
              {totalPages > 1 && (
                <>
                  <span className="text-gray-400">|</span>
                  <span>第 {currentPage} / {totalPages} 页</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 智能体列表 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <img
                        src={getAvatarUrl(agent)}
                        alt={agent.name}
                        className="w-10 h-10 rounded-full mr-3"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=random&size=128`;
                        }}
                      />
                      <div className="font-medium text-gray-900">{agent.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                    {agent.description}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(agent)}
                      className={'px-3 py-1 rounded-full text-xs font-medium ' +
                        (agent.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')
                      }
                    >
                      {agent.isActive ? '已激活' : '已禁用'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(agent.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/admin/messages?agentId=${agent.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      聊天记录
                    </Link>
                    <button onClick={() => handleEdit(agent)} className="text-blue-600 hover:text-blue-900">编辑</button>
                    <button onClick={() => deleteAgent(agent.id)} className="text-red-600 hover:text-red-900">删除</button>
                  </td>
                </tr>
              ))}
              {paginatedAgents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? '没有找到匹配的智能体' : '暂无智能体'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>

              <div className="flex items-center space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 编辑智能体弹窗 */}
      {showModal && editingAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">{isCreating ? '➕ 添加智能体' : '✏️ 编辑智能体'}</h2>
            {polishError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {polishError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  type="text"
                  value={editingAgent.name}
                  onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">头像 URL</label>
                <input
                  type="text"
                  value={editingAgent.avatar}
                  onChange={(e) => setEditingAgent({ ...editingAgent, avatar: e.target.value })}
                  placeholder="https://ui-avatars.com/api/?name=..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editingAgent.description}
                  onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最小字数</label>
                  <input
                    type="number"
                    min={0}
                    value={editingAgent.minContentLength ?? 0}
                    onChange={(e) => setEditingAgent({ ...editingAgent, minContentLength: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最少参考图</label>
                  <input
                    type="number"
                    min={0}
                    value={editingAgent.minReferenceImages ?? 0}
                    onChange={(e) => setEditingAgent({ ...editingAgent, minReferenceImages: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">技能特长</label>
                <input
                  type="text"
                  value={editingAgent.skills}
                  onChange={(e) => setEditingAgent({ ...editingAgent, skills: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">系统提示词</label>
                <textarea
                  value={editingAgent.systemPrompt}
                  onChange={(e) => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规则提示词（软约束）</label>
                <textarea
                  value={editingAgent.policyPrompt || ''}
                  onChange={(e) => setEditingAgent({ ...editingAgent, policyPrompt: e.target.value })}
                  rows={4}
                  placeholder="示例：至少两张参考图；文字需≥10字；避免色情暴力。"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-6 gap-3">
              <button
                onClick={handlePolishAgent}
                disabled={polishingAgent}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                title="使用全局设置中的“审核模型”对描述/特长/规则进行润色"
              >
                {polishingAgent ? '润色中...' : 'AI 润色（描述/特长/规则）'}
              </button>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => { setShowModal(false); setEditingAgent(null); setPolishError(''); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={polishingAgent}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑全局设置弹窗 */}
      {showSettingsModal && editingSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">🔧 编辑全局设置</h2>
            <div className="space-y-4">
              {/* 图片生成 API 配置 */}
              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">🎨 图片生成 API</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API 端点</label>
                    <input
                      type="text"
                      value={editingSettings.imageApiUrl}
                      onChange={(e) => setEditingSettings({ ...editingSettings, imageApiUrl: e.target.value })}
                      placeholder="https://your-ai.example.com/v1/chat/completions"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
                    <input
                      type="text"
                      value={editingSettings.imageModel}
                      onChange={(e) => setEditingSettings({ ...editingSettings, imageModel: e.target.value })}
                      placeholder="gemini-3-pro-image-preview"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API 密钥
                      {settings?.hasImageApiKey && (
                        <span className="text-gray-500 font-normal ml-2">(留空保持不变)</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={editingSettings.imageApiKey}
                      onChange={(e) => setEditingSettings({ ...editingSettings, imageApiKey: e.target.value })}
                      placeholder={settings?.hasImageApiKey ? '••••••••' : '请输入 API 密钥'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 语音识别 API 配置 */}
              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">🎤 语音识别 API</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API 端点</label>
                    <input
                      type="text"
                      value={editingSettings.speechApiUrl}
                      onChange={(e) => setEditingSettings({ ...editingSettings, speechApiUrl: e.target.value })}
                      placeholder="https://your-asr.example.com/v1/audio/transcriptions"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API 密钥
                      {settings?.hasSpeechApiKey && (
                        <span className="text-gray-500 font-normal ml-2">(留空保持不变)</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={editingSettings.speechApiKey}
                      onChange={(e) => setEditingSettings({ ...editingSettings, speechApiKey: e.target.value })}
                      placeholder={settings?.hasSpeechApiKey ? '••••••••' : '请输入 API 密钥（可选）'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 审核模型配置 */}
              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">🛡 审核模型 API</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API 端点</label>
                    <input
                      type="text"
                      value={editingSettings.moderationApiUrl}
                      onChange={(e) => setEditingSettings({ ...editingSettings, moderationApiUrl: e.target.value })}
                      placeholder="https://moderation.example.com/v1/chat/completions"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
                    <input
                      type="text"
                      value={editingSettings.moderationModel}
                      onChange={(e) => setEditingSettings({ ...editingSettings, moderationModel: e.target.value })}
                      placeholder="moderation-model"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API 密钥
                      {settings?.hasModerationApiKey && (
                        <span className="text-gray-500 font-normal ml-2">(留空保持不变)</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={editingSettings.moderationApiKey}
                      onChange={(e) => setEditingSettings({ ...editingSettings, moderationApiKey: e.target.value })}
                      placeholder={settings?.hasModerationApiKey ? '••••••••' : '请输入 API 密钥（可选）'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 图床配置 */}
              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">🖼 图床服务</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">图床地址</label>
                    <input
                      type="text"
                      value={editingSettings.imagebedUrl}
                      onChange={(e) => setEditingSettings({ ...editingSettings, imagebedUrl: e.target.value })}
                      placeholder="https://your-imagebed.example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      图床 Token
                      {settings?.hasImagebedToken && (
                        <span className="text-gray-500 font-normal ml-2">(留空保持不变)</span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={editingSettings.imagebedToken}
                      onChange={(e) => setEditingSettings({ ...editingSettings, imagebedToken: e.target.value })}
                      placeholder={settings?.hasImagebedToken ? '••••••••' : '请输入图床 Token（可选）'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 安全设置 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3">🔒 安全设置</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    管理密码
                    {settings?.hasAdminPassword && (
                      <span className="text-gray-500 font-normal ml-2">(留空保持不变)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={editingSettings.adminPassword || ''}
                    onChange={(e) => setEditingSettings({ ...editingSettings, adminPassword: e.target.value })}
                    placeholder={settings?.hasAdminPassword ? '••••••••' : '设置新密码（默认: admin123）'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">用于登录后台管理页面</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowSettingsModal(false); setEditingSettings(null); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {savingSettings ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

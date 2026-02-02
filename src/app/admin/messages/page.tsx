'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
}

interface ChatMessage {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  generationTime?: number | null;
  imageData?: string | null;
  referenceImages?: string[] | null;
  agent: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    nickname: string;
    ip: string;
  };
}

const PAGE_SIZE = 10;

function MessageAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialAgent = searchParams.get('agentId') || 'all';

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messagePage, setMessagePage] = useState(1);
  const [messageTotal, setMessageTotal] = useState(0);
  const [messageKeyword, setMessageKeyword] = useState('');
  const [messageType, setMessageType] = useState<'all' | 'text' | 'image'>('all');
  const [messageAgentFilter, setMessageAgentFilter] = useState<string>(initialAgent);

  // 认证检查
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin');
      return;
    }
    verifyToken(token);
  }, [router]);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/admin/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setIsAuthenticated(true);
        fetchAgents();
        fetchMessages(1, { agentId: messageAgentFilter });
      } else {
        localStorage.removeItem('admin_token');
        router.replace('/admin');
      }
    } catch {
      localStorage.removeItem('admin_token');
      router.replace('/admin');
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/agents', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('加载智能体失败:', error);
    }
  };

  const fetchMessages = async (
    pageNumber = 1,
    options?: {
      keyword?: string;
      type?: 'all' | 'text' | 'image';
      agentId?: string;
    }
  ) => {
    if (!isAuthenticated) return;
    setMessageLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const keyword = options?.keyword ?? messageKeyword;
      const type = options?.type ?? messageType;
      const agentId = options?.agentId ?? messageAgentFilter;
      const params = new URLSearchParams({
        page: String(pageNumber),
        pageSize: String(PAGE_SIZE),
      });

      if (keyword.trim()) {
        params.append('keyword', keyword.trim());
      }
      if (type !== 'all') {
        params.append('type', type);
      }
      if (agentId !== 'all') {
        params.append('agentId', agentId);
      }

      const response = await fetch(`/api/admin/messages?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setChatMessages(data.data.items || []);
        setMessageTotal(data.data.total || 0);
        setMessagePage(pageNumber);
      } else if (response.status === 401) {
        localStorage.removeItem('admin_token');
        router.replace('/admin');
      } else {
        alert(data.error?.message || '加载聊天记录失败');
      }
    } catch (error) {
      console.error('加载聊天记录失败:', error);
    } finally {
      setMessageLoading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('确定要删除这条聊天记录吗?')) return;
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/messages/' + id, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        fetchMessages(messagePage);
      } else if (response.status === 401) {
        localStorage.removeItem('admin_token');
        router.replace('/admin');
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('删除聊天记录失败:', error);
    }
  };

  const handleMessageSearch = () => {
    fetchMessages(1);
  };

  const resetMessageFilters = () => {
    setMessageKeyword('');
    setMessageType('all');
    setMessageAgentFilter('all');
    fetchMessages(1, { keyword: '', type: 'all', agentId: 'all' });
  };

  const messageTotalPages = useMemo(() => Math.max(1, Math.ceil(messageTotal / PAGE_SIZE)), [messageTotal]);

  // 加载/鉴权态
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">验证中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">聊天记录管理</h1>
            <p className="text-gray-600 mt-2">按关键词、智能体、消息类型筛选，支持删除异常记录</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              返回智能体管理
            </Link>
            <button
              onClick={() => fetchMessages(1)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              刷新
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">关键词</label>
              <input
                type="text"
                value={messageKeyword}
                onChange={(e) => setMessageKeyword(e.target.value)}
                placeholder="内容 / 昵称 / IP"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">智能体</label>
              <select
                value={messageAgentFilter}
                onChange={(e) => setMessageAgentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">全部智能体</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">消息类型</label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as 'all' | 'text' | 'image')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">全部</option>
                <option value="text">文本</option>
                <option value="image">图片</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleMessageSearch}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 w-full"
              >
                查询
              </button>
              <button
                onClick={resetMessageFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 w-full"
              >
                重置
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {messageLoading ? (
              <div className="text-center text-gray-500 py-6">加载中...</div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-6">暂无聊天记录</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">智能体</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">内容 / 图片</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">耗时</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {chatMessages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(msg.createdAt).toLocaleString('zh-CN', { hour12: false })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex flex-col">
                          <span className="font-medium">{msg.user.nickname}</span>
                          <span className="text-xs text-gray-500">{msg.user.ip}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{msg.agent.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {msg.type === 'image' ? (
                          <div className="flex items-center gap-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">图片</span>
                            {msg.imageData || (msg.referenceImages && msg.referenceImages.length > 0) ? (
                              <img
                                src={msg.imageData || msg.referenceImages?.[0] || ''}
                                alt="生成图片"
                                className="w-16 h-16 rounded object-cover border"
                              />
                            ) : (
                              <span className="text-gray-500 text-xs">无预览</span>
                            )}
                            {msg.content && <span className="text-gray-600 line-clamp-2 max-w-xs">{msg.content}</span>}
                          </div>
                        ) : (
                          <p className="text-gray-700 line-clamp-2 max-w-md">{msg.content}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {msg.generationTime ? `${msg.generationTime} ms` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        <button onClick={() => deleteMessage(msg.id)} className="text-red-600 hover:text-red-800">
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 分页 */}
          {chatMessages.length > 0 && !messageLoading && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t mt-2">
              <button
                onClick={() => fetchMessages(Math.max(1, messagePage - 1))}
                disabled={messagePage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <div className="text-sm text-gray-600">
                第 {messagePage} / {messageTotalPages} 页 · 共 {messageTotal} 条
              </div>
              <button
                onClick={() => fetchMessages(Math.min(messageTotalPages, messagePage + 1))}
                disabled={messagePage >= messageTotalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessageAdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    }>
      <MessageAdminContent />
    </Suspense>
  );
}

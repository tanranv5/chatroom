'use client';

import { useTheme } from '@/contexts/ThemeContext';

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light' as const, label: '浅色', icon: '☀️' },
    { value: 'dark' as const, label: '深色', icon: '🌙' },
    { value: 'system' as const, label: '自动', icon: '⚙️' },
  ];

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-secondary)' }}>
      {/* 网站信息卡片 */}
      <div style={{ background: 'var(--bg-tertiary)' }} className="px-4 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#07C160] to-[#06AE56] flex items-center justify-center shadow-sm">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[17px] font-semibold" style={{ color: 'var(--label-primary)' }}>AI 公益绘图平台</h3>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--label-secondary)' }}>免费 · 开放 · 共享</p>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-[15px] leading-relaxed" style={{ color: 'var(--label-secondary)' }}>
            🎨 这是一个<span className="text-[#07C160] font-medium">完全免费</span>的 AI 绘图平台，旨在让每个人都能体验 AI 创作的乐趣。
          </p>
          <div className="mt-4 space-y-2.5">
            {[
              '无需注册，即开即用',
              '所有作品公开共享，激发创意灵感',
              '多个 AI 智能体，满足不同创作需求',
              '持续更新，不断优化体验',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-[#07C160] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-[15px]" style={{ color: 'var(--label-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 外观设置 - iOS 风格分段控件 */}
      <div className="mt-6 px-4">
        <p className="text-[13px] font-medium uppercase tracking-wide mb-2 px-4" style={{ color: 'var(--label-secondary)' }}>
          外观
        </p>
        <div
          className="rounded-xl p-1"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <div className="grid grid-cols-3 gap-1">
            {themeOptions.map((option) => {
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className="relative flex flex-col items-center justify-center py-4 rounded-lg transition-all duration-200 active:scale-95"
                  style={{
                    background: isSelected ? 'var(--system-blue)' : 'transparent',
                    boxShadow: isSelected ? '0 2px 8px rgba(0, 122, 255, 0.3)' : 'none',
                  }}
                >
                  <span className="text-[28px] mb-1">{option.icon}</span>
                  <span
                    className="text-[13px] font-medium"
                    style={{
                      color: isSelected ? '#FFFFFF' : 'var(--label-primary)'
                    }}
                  >
                    {option.label}
                  </span>
                  {isSelected && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white opacity-80" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部留白 */}
      <div className="h-8" />
    </div>
  );
}

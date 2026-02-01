'use client';

import { useState } from 'react';
import SearchBar from '@/components/SearchBar';

interface ListHeaderProps {
  title: string;
  showSearch?: boolean;
  showAdd?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

/**
 * Apple HIG Compliant List Header
 *
 * Design Decisions:
 * - 44px height following iOS Navigation Bar specifications
 * - Large Title style with SF Pro semibold 17px
 * - System Blue for action buttons
 * - Safe area support for notched devices
 */
export default function ListHeader({
  title,
  showSearch = true,
  showAdd = false,
  searchQuery = '',
  onSearchChange
}: ListHeaderProps) {
  const [showToast, setShowToast] = useState(false);

  const handleAddClick = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <>
      <div
        className="border-b safe-area-top"
        style={{
          background: 'var(--bg-primary)',
          borderColor: 'var(--separator)',
          padding: 'var(--space-3) var(--space-4)'
        }}
      >
        <div className="flex items-center justify-between h-[44px]">
          {/* Leading: Placeholder for balance */}
          <div className="w-8" />

          {/* Center: Title */}
          <h1
            className="font-semibold text-[17px]"
            style={{ color: 'var(--label-primary)' }}
          >
            {title}
          </h1>

          {/* Trailing: Add Button */}
          <div className="flex items-center gap-2">
            {showAdd && (
              <button
                onClick={handleAddClick}
                className="w-[44px] h-[44px] flex items-center justify-center btn-press"
                style={{ color: 'var(--system-green)' }}
                aria-label="添加"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            {!showAdd && <div className="w-8" />}
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <SearchBar
              value={searchQuery}
              onChange={(value) => onSearchChange?.(value)}
              placeholder="搜索"
            />
          </div>
        )}
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <div
            className="px-6 py-3 text-sm text-white"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            暂不支持自定义智能体
          </div>
        </div>
      )}
    </>
  );
}

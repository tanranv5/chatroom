'use client';

import Image from 'next/image';

interface ChatHeaderProps {
  name: string;
  avatar: string;
  onBack?: () => void;
}

/**
 * Apple HIG Compliant Toolbar
 *
 * Design Decisions:
 * - 44px height following iOS Navigation Bar specifications
 * - Back button: circular with chevron symbol only
 * - Title centered with SF Pro semibold 17px
 * - Online indicator using System Green
 * - Safe area support for notched devices
 */
export default function ChatHeader({ name, avatar, onBack }: ChatHeaderProps) {
  // 获取有效的头像 URL
  const getAvatarUrl = () => {
    const avatarTrimmed = avatar?.trim();
    const isPlaceholder = avatarTrimmed === '/ai-avatar.svg' || avatarTrimmed === '/user-avatar.svg';

    if (avatarTrimmed && avatarTrimmed !== '' && !isPlaceholder) {
      if (avatarTrimmed.length <= 4 && !/[\/.]/.test(avatarTrimmed)) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
      }

      if (
        avatarTrimmed.startsWith('http://') ||
        avatarTrimmed.startsWith('https://') ||
        avatarTrimmed.startsWith('/') ||
        avatarTrimmed.startsWith('data:') ||
        avatarTrimmed.startsWith('blob:')
      ) {
        return avatarTrimmed;
      }
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=128`;
  };

  return (
    <div
      className="bg-[var(--bg-primary)] border-b safe-area-top"
      style={{ borderColor: 'var(--separator)' }}
    >
      <div className="flex items-center justify-between h-[44px] px-4">
        {/* Leading: Back Button */}
        <div className="flex items-center min-w-[70px]">
          <button
            onClick={onBack}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-full btn-press"
            style={{ color: 'var(--system-green)' }}
            aria-label="返回"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Center: Avatar + Title + Status */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <div
            className="w-8 h-8 rounded-full overflow-hidden"
            style={{ background: 'var(--system-gray5)' }}
          >
            <Image
              src={getAvatarUrl()}
              alt={name}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <span
            className="font-semibold text-[17px] truncate max-w-[150px]"
            style={{ color: 'var(--label-primary)' }}
          >
            {name}
          </span>
          {/* Online Status Indicator */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: 'var(--system-green)' }}
            aria-label="在线"
          />
        </div>

        {/* Trailing: Placeholder for balance */}
        <div className="min-w-[70px]" />
      </div>
    </div>
  );
}

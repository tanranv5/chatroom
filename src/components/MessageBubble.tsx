'use client';

import { Message } from '@/types';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

/**
 * Apple HIG Compliant Message Bubble
 *
 * Design Decisions:
 * - System Blue for own messages, white/gray for others
 * - 16px border radius following HIG specifications
 * - Smooth animations with Apple-standard easing
 * - Accessible image viewing with proper focus management
 */
export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [hasAlpha, setHasAlpha] = useState<boolean | null>(null);

  const getAvatarUrl = (avatar: string, name: string) => {
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

  const detectAlphaChannel = async (src: string): Promise<boolean | null> => {
    if (/^data:image\/jpe?g/i.test(src) || /\.(jpe?g)(\?|#|$)/i.test(src)) {
      return false;
    }

    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('加载图片失败'));
        img.src = src;
      });

      const sampleSize = 64;
      const canvas = document.createElement('canvas');
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.clearRect(0, 0, sampleSize, sampleSize);
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] < 255) return true;
      }
      return false;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!showFullImage) return;
    const src = fullImageUrl || message.imageUrl;
    if (!src) return;

    let cancelled = false;

    (async () => {
      const result = await detectAlphaChannel(src);
      if (!cancelled) setHasAlpha(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [showFullImage, fullImageUrl, message.imageUrl]);

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Loading state
  if (message.type === 'loading') {
    return (
      <div className={`flex items-start gap-2 px-4 py-2 message-animate ${isOwn ? 'flex-row-reverse' : ''}`}>
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
          style={{ background: 'var(--system-gray5)' }}
        >
          <Image
            src={getAvatarUrl(message.senderAvatar, message.senderName)}
            alt={message.senderName}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
          <span
            className="text-xs mb-1"
            style={{ color: 'var(--label-secondary)' }}
          >
            {message.senderName}
          </span>
          <div
            className="px-4 py-3"
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--system-gray)', animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--system-gray)', animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--system-gray)', animationDelay: '300ms' }}
                />
              </div>
              <span
                className="text-sm"
                style={{ color: 'var(--label-secondary)' }}
              >
                AI 正在创作中...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-start gap-2 px-4 py-2 message-animate ${isOwn ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
          style={{ background: 'var(--system-gray5)' }}
        >
          <Image
            src={getAvatarUrl(message.senderAvatar, message.senderName)}
            alt={message.senderName}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Message Body */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
          <span
            className="text-xs mb-1"
            style={{ color: 'var(--label-secondary)' }}
          >
            {message.senderName}
          </span>

          {/* Message Bubble */}
          <div
            className="relative"
            style={{
              background: isOwn ? 'var(--system-green)' : 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* Text Content */}
            {message.content && (
              <p
                className="px-3 py-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words"
                style={{ color: isOwn ? '#FFFFFF' : 'var(--label-primary)' }}
              >
                {message.content}
              </p>
            )}

            {/* Reference Images */}
            {message.referenceImages?.length && (
              <div className="p-1">
                <div className="grid grid-cols-2 gap-1">
                  {message.referenceImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setHasAlpha(null);
                        setFullImageUrl(img);
                        setShowFullImage(true);
                      }}
                      className="relative overflow-hidden active:opacity-80 transition-opacity"
                      style={{
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--system-gray6)',
                        minWidth: '120px',
                        minHeight: '120px'
                      }}
                      aria-label="查看参考图"
                    >
                      <img
                        src={img}
                        alt="参考图"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Content */}
            {message.type === 'image' && message.imageUrl && (
              <div className="p-1">
                <div
                  onClick={() => {
                    setHasAlpha(null);
                    setFullImageUrl(message.imageUrl!);
                    setShowFullImage(true);
                  }}
                  className={`relative overflow-hidden cursor-pointer active:opacity-80 transition-opacity ${!imageLoaded && !imageError ? 'image-loading' : ''}`}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    minWidth: '200px',
                    minHeight: '200px'
                  }}
                >
                  {!imageError ? (
                    <Image
                      src={message.imageUrl}
                      alt="AI 生成的图片"
                      width={280}
                      height={280}
                      className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                      style={{ borderRadius: 'var(--radius-md)' }}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div
                      className="w-[280px] h-[200px] flex items-center justify-center"
                      style={{
                        background: 'var(--system-gray6)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <span style={{ color: 'var(--label-tertiary)', fontSize: '14px' }}>
                        图片加载失败
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 mt-1">
            {/* 私密标签 - 仅自己可见 */}
            {message.isPublishedToSquare === false && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--system-gray5)',
                  color: 'var(--label-secondary)'
                }}
              >
                私密
              </span>
            )}
            <span
              className="text-[10px]"
              style={{ color: 'var(--label-tertiary)' }}
            >
              {formatTime(message.timestamp)}
            </span>
          </div>
        </div>
      </div>

      {/* Full Screen Image Viewer */}
      {showFullImage && (fullImageUrl || message.imageUrl) && (
        <div
          onClick={() => {
            setShowFullImage(false);
            setFullImageUrl(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: hasAlpha === true
              ? 'linear-gradient(45deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.18) 75%, rgba(255,255,255,0.18)), linear-gradient(45deg, rgba(255,255,255,0.18) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.18) 75%, rgba(255,255,255,0.18))'
              : 'rgba(0,0,0,0.9)',
            backgroundSize: hasAlpha === true ? '24px 24px' : undefined,
            backgroundPosition: hasAlpha === true ? '0 0, 12px 12px' : undefined,
          }}
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
        >
          <div className="relative max-w-4xl max-h-full">
            <Image
              src={fullImageUrl || message.imageUrl!}
              alt="AI 生成的图片"
              width={800}
              height={800}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFullImage(false);
                setFullImageUrl(null);
              }}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white transition-colors btn-press"
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: 'var(--radius-full)'
              }}
              aria-label="关闭"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

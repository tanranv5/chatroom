'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string, referenceImages?: string[], publishToSquare?: boolean) => void;
  disabled?: boolean;
  minContentLength?: number;
  minReferenceImages?: number;
}

/**
 * Apple HIG Compliant Input Area
 *
 * Design Decisions:
 * - System Blue for send button and focus states
 * - 44px minimum touch targets
 * - Rounded input field with subtle background
 * - Safe area support for notched devices
 */
export default function ChatInput({ onSend, disabled = false, minContentLength = 0, minReferenceImages = 0 }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [publishToSquare, setPublishToSquare] = useState(true); // 默认发布到广场
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOperatingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const showToastMsg = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const MAX_IMAGES = Math.max(minReferenceImages || 0, 5);

  const handleSend = () => {
    const trimmed = message.trim();
    if (disabled) return;

    if (trimmed && minContentLength > 0 && trimmed.length < minContentLength) {
      showToastMsg(`需要至少 ${minContentLength} 个字`);
      return;
    }

    if (selectedImages.length > 0 && selectedImages.length < minReferenceImages) {
      showToastMsg(`该智能体需要至少 ${minReferenceImages} 张参考图`);
      return;
    }

    if (trimmed || selectedImages.length > 0) {
      onSend(trimmed, selectedImages.length > 0 ? selectedImages.slice(0, MAX_IMAGES) : undefined, publishToSquare);
      setMessage('');
      setSelectedImages([]);
      setPublishToSquare(true); // 重置为默认发布到广场
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageClick = () => {
    if (disabled || isRecording) return;
    if (selectedImages.length >= MAX_IMAGES) {
      showToastMsg(`最多选择 ${MAX_IMAGES} 张图片`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = Math.max(0, MAX_IMAGES - selectedImages.length);
    if (remainingSlots === 0) {
      showToastMsg(`最多选择 ${MAX_IMAGES} 张图片`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newImages: string[] = [];
    const maxRead = Math.min(files.length, remainingSlots, 9);
    for (let i = 0; i < maxRead; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newImages.push(base64);
      } catch (error) {
        console.error('读取图片失败:', error);
      }
    }

    setSelectedImages(prev => [...prev, ...newImages].slice(0, MAX_IMAGES));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'touches' in e) e.preventDefault();
    if (isOperatingRef.current || isRecording || isProcessing) return;

    isOperatingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('无法访问麦克风:', error);
      showToastMsg('无法访问麦克风，请检查权限');
      isOperatingRef.current = false;
    }
  };

  const stopRecording = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'touches' in e) e.preventDefault();
    if (!isRecording || !mediaRecorderRef.current) return;

    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (isProcessing) return;

    setIsProcessing(true);
    showToastMsg('正在识别语音...');

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_file: {
            data: base64,
            name: 'recording.webm',
            type: audioBlob.type,
            size: audioBlob.size
          },
          language: 'auto'
        })
      });

      const result = await response.json();

      if (result.success && result.data?.text) {
        setMessage(prev => prev + result.data.text);
        showToastMsg('识别成功');
      } else {
        showToastMsg(result.error?.message || '语音识别失败');
      }
    } catch (error) {
      console.error('语音识别失败:', error);
      showToastMsg('语音识别失败');
    } finally {
      setIsProcessing(false);
      isOperatingRef.current = false;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div
        className="border-t safe-area-bottom"
        style={{
          background: 'var(--bg-primary)',
          borderColor: 'var(--separator)',
          padding: 'var(--space-2) var(--space-3)'
        }}
      >
        {/* 发到广场开关 - 右侧布局 */}
        {(message.trim() || selectedImages.length > 0) && (
          <div className="mb-2 flex items-center justify-end">
            <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <span className="text-[13px]" style={{ color: 'var(--label-secondary)' }}>
                {publishToSquare ? '发到广场' : '仅自己可见'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={publishToSquare}
                onClick={() => setPublishToSquare(!publishToSquare)}
                className="relative inline-flex items-center h-[31px] w-[51px] rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                style={{
                  backgroundColor: publishToSquare ? 'var(--system-green)' : 'rgba(120, 120, 128, 0.16)'
                }}
              >
                <span
                  className="inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out"
                  style={{
                    transform: publishToSquare ? 'translateX(22px)' : 'translateX(2px)',
                    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15), 0 3px 1px rgba(0, 0, 0, 0.06)'
                  }}
                />
              </button>
            </label>
          </div>
        )}

        {/* 图片预览 */}
        {selectedImages.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-2">
              {selectedImages.map((img, index) => (
                <div key={index} className="relative w-16 h-16">
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-white text-xs"
                    style={{
                      background: 'var(--system-red)',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div
              className="mt-1 text-xs"
              style={{ color: 'var(--label-secondary)' }}
            >
              已选 {selectedImages.length}/{MAX_IMAGES}{minReferenceImages > 0 ? `（至少 ${minReferenceImages} 张）` : ''}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* 语音按钮 */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={disabled || isProcessing}
            className="w-[44px] h-[44px] flex items-center justify-center flex-shrink-0 btn-press transition-colors disabled:opacity-50"
            style={{
              color: isRecording ? '#FFFFFF' : 'var(--system-gray)',
              background: isRecording ? 'var(--system-red)' : 'transparent',
              borderRadius: 'var(--radius-full)'
            }}
            aria-label="语音输入"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* 输入框 */}
          <div
            className="flex-1"
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            {isRecording ? (
              <div
                className="px-4 py-3 text-[15px] flex items-center gap-2"
                style={{ color: 'var(--system-red)' }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: 'var(--system-red)' }}
                />
                录音中 {formatTime(recordingTime)}... 松开发送
              </div>
            ) : isProcessing ? (
              <div
                className="px-4 py-3 text-[15px] flex items-center gap-2"
                style={{ color: 'var(--system-blue)' }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: 'var(--system-blue)' }}
                />
                正在识别语音...
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述你想要的图片..."
                disabled={disabled}
                rows={1}
                className="w-full px-4 py-3 text-[17px] bg-transparent resize-none outline-none disabled:opacity-50"
                style={{
                  color: 'var(--label-primary)',
                  maxHeight: '120px'
                }}
              />
            )}
          </div>

          {/* 图片按钮 */}
          <button
            onClick={handleImageClick}
            disabled={disabled || isRecording || selectedImages.length >= MAX_IMAGES}
            className="w-[44px] h-[44px] flex items-center justify-center flex-shrink-0 btn-press disabled:opacity-50"
            style={{ color: 'var(--system-gray)' }}
            title={selectedImages.length >= MAX_IMAGES ? `最多 ${MAX_IMAGES} 张` : '选择图片'}
            aria-label="选择图片"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && selectedImages.length === 0)}
            className="w-[44px] h-[44px] flex items-center justify-center flex-shrink-0 btn-press disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--system-green)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-full)'
            }}
            title="发送"
            aria-label="发送"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Toast 提示 */}
      {showToast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <div
            className="px-6 py-3 text-sm text-white"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface RoomCreatedSuccessProps {
  shareCode: string;
  onContinue: () => void;
}

export function RoomCreatedSuccess({ shareCode, onContinue }: RoomCreatedSuccessProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/?code=${shareCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-6">
      <div className="bg-theme-success-soft rounded-lg border border-theme-success p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-theme-success mb-2">방이 생성되었습니다!</h2>
        <p className="text-theme-text-sub mb-6">
          아래 링크를 공유하면 다른 사람들이 일정을 입력할 수 있습니다.
        </p>

        <div className="bg-white rounded-lg p-4 mb-6 border border-theme-border">
          <p className="text-sm text-theme-text-sub mb-2">공유 링크</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm text-theme-text-main break-all text-left">
              {shareUrl}
            </code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 p-2 hover:bg-gray-200 rounded transition-colors"
            >
              {copied ? (
                <Check size={18} className="text-theme-success" />
              ) : (
                <Copy size={18} className="text-theme-text-sub" />
              )}
            </button>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full bg-theme-success text-white font-medium py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          결과 확인하러 가기
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { supabase } from '../firebase';
import { formatDate } from '../utils/dateRange';

interface CreateRoomProps {
  onRoomCreated: (roomId: string, shareCode: string) => void;
}

export function CreateRoom({ onRoomCreated }: CreateRoomProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title || !startDate || !endDate) {
      alert('모든 정보를 입력해주세요');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('시작일이 종료일보다 클 수 없습니다');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([
          {
            title,
            start_date: startDate,
            end_date: endDate,
          },
        ])
        .select()
        .maybeSingle();

      if (error) throw error;

      if (data) {
        onRoomCreated(data.id, data.share_code);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('방 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-6">
      <h1 className="text-4xl font-bold text-theme-primary mb-2">모여봐요</h1>
      <p className="text-theme-text-sub mb-8 text-center">그룹 약속 잡기 서비스</p>

      <div className="bg-theme-surface rounded-lg shadow-md p-8 border border-theme-border">
        <div className="mb-6">
          <label className="block text-sm font-medium text-theme-text-main mb-2">
            약속 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: MT 날짜 잡기"
            className="w-full px-4 py-3 border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-theme-text-main mb-2">
            시작일
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary"
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-theme-text-main mb-2">
            종료일
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-3 border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-theme-primary text-white font-medium py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? '방 만드는 중...' : '방 만들기'}
        </button>
      </div>
    </div>
  );
}

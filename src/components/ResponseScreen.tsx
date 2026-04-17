import React, { useState, useEffect } from 'react';
import { supabase } from '../firebase';
import { getDateRange, formatDate, getDayOfWeek } from '../utils/dateRange';

interface ResponseScreenProps {
  roomId: string;
  startDate: string;
  endDate: string;
  onResponseSubmitted: () => void;
}

export function ResponseScreen({
  roomId,
  startDate,
  endDate,
  onResponseSubmitted,
}: ResponseScreenProps) {
  const [userName, setUserName] = useState('');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const dates = getDateRange(new Date(startDate), new Date(endDate));

  const handleDateToggle = (dateString: string) => {
    const newSelected = new Set(selectedDates);
    if (newSelected.has(dateString)) {
      newSelected.delete(dateString);
    } else {
      newSelected.add(dateString);
    }
    setSelectedDates(newSelected);
  };

  const handleSubmit = async () => {
    if (!userName.trim()) {
      alert('이름을 입력해주세요');
      return;
    }

    if (selectedDates.size === 0) {
      alert('최소 하나의 날짜를 선택해주세요');
      return;
    }

    setLoading(true);

    try {
      const { data: responseData, error: responseError } = await supabase
        .from('responses')
        .insert([
          {
            room_id: roomId,
            user_name: userName.trim(),
          },
        ])
        .select()
        .maybeSingle();

      if (responseError) throw responseError;

      if (responseData) {
        const dateInserts = Array.from(selectedDates).map((date) => ({
          response_id: responseData.id,
          available_date: date,
        }));

        const { error: dateError } = await supabase
          .from('available_dates')
          .insert(dateInserts);

        if (dateError) throw dateError;

        setSubmitted(true);
        setTimeout(() => {
          onResponseSubmitted();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
      alert('응답 제출에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-20 px-6">
        <div className="bg-theme-success-soft rounded-lg border border-theme-success p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-theme-success mb-2">응답이 저장되었습니다!</h2>
          <p className="text-theme-text-sub">
            결과 화면으로 이동하는 중입니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 px-6 pb-10">
      <h1 className="text-3xl font-bold text-theme-primary mb-8 text-center">일정 입력하기</h1>

      <div className="bg-theme-surface rounded-lg shadow-md p-8 border border-theme-border">
        <div className="mb-8">
          <label className="block text-sm font-medium text-theme-text-main mb-3">
            이름
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="이름을 입력해주세요"
            className="w-full px-4 py-3 border border-theme-border rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary"
          />
        </div>

        <div className="mb-8">
          <p className="text-sm font-medium text-theme-text-main mb-4">
            가능한 날짜를 선택해주세요 ({selectedDates.size}개 선택)
          </p>

          <div className="grid grid-cols-4 gap-2">
            {dates.map((date) => {
              const dateString = formatDate(date);
              const isSelected = selectedDates.has(dateString);
              const day = getDayOfWeek(date);

              return (
                <button
                  key={dateString}
                  onClick={() => handleDateToggle(dateString)}
                  className={`p-3 rounded-lg border-2 transition-colors text-center ${
                    isSelected
                      ? 'bg-theme-primary border-theme-primary text-white font-semibold'
                      : 'border-theme-border hover:border-theme-primary text-theme-text-main'
                  }`}
                >
                  <div className="text-xs mb-1">{day}</div>
                  <div className="text-sm font-semibold">{date.getDate()}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-theme-primary text-white font-medium py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? '제출 중...' : '제출하기'}
        </button>
      </div>
    </div>
  );
}

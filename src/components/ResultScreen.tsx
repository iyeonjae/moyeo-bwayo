import React, { useState, useEffect } from 'react';
import { supabase } from '../firebase';
import { getDateRange, formatDate, getDayOfWeek } from '../utils/dateRange';

interface UserAvailability {
  userName: string;
  availableDates: Set<string>;
}

interface ResultScreenProps {
  roomId: string;
  startDate: string;
  endDate: string;
  title: string;
}

export function ResultScreen({ roomId, startDate, endDate, title }: ResultScreenProps) {
  const [userAvailabilities, setUserAvailabilities] = useState<UserAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  const dates = getDateRange(new Date(startDate), new Date(endDate));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: responses, error: responsesError } = await supabase
          .from('responses')
          .select('id, user_name')
          .eq('room_id', roomId);

        if (responsesError) throw responsesError;

        if (!responses || responses.length === 0) {
          setUserAvailabilities([]);
          setLoading(false);
          return;
        }

        const { data: availableDates, error: datesError } = await supabase
          .from('available_dates')
          .select('response_id, available_date')
          .in(
            'response_id',
            responses.map((r) => r.id)
          );

        if (datesError) throw datesError;

        const availabilityMap = new Map<string, Set<string>>();

        responses.forEach((response) => {
          availabilityMap.set(response.user_name, new Set());
        });

        availableDates?.forEach((availability) => {
          const user = responses.find((r) => r.id === availability.response_id);
          if (user && availabilityMap.has(user.user_name)) {
            availabilityMap.get(user.user_name)!.add(availability.available_date);
          }
        });

        const userAvailList: UserAvailability[] = Array.from(availabilityMap, ([userName, dates]) => ({
          userName,
          availableDates: dates,
        }));

        setUserAvailabilities(userAvailList);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roomId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-20 px-6 text-center">
        <p className="text-theme-text-sub">데이터를 불러오는 중...</p>
      </div>
    );
  }

  const getAllAvailableDates = (): Set<string> => {
    if (userAvailabilities.length === 0) return new Set();

    let commonDates = new Set(userAvailabilities[0].availableDates);
    for (let i = 1; i < userAvailabilities.length; i++) {
      commonDates = new Set([...commonDates].filter((x) => userAvailabilities[i].availableDates.has(x)));
    }
    return commonDates;
  };

  const getCountForDate = (dateString: string): number => {
    return userAvailabilities.filter((u) => u.availableDates.has(dateString)).length;
  };

  const commonDates = getAllAvailableDates();

  return (
    <div className="max-w-6xl mx-auto mt-10 px-6 pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-primary mb-2">{title}</h1>
        <p className="text-theme-text-sub">
          참여자: {userAvailabilities.length}명
          {commonDates.size > 0 && ` • 모두 가능한 날짜: ${commonDates.size}개`}
        </p>
      </div>

      {userAvailabilities.length === 0 ? (
        <div className="bg-theme-surface rounded-lg shadow-md p-12 text-center border border-theme-border">
          <p className="text-theme-text-sub mb-2">아직 응답이 없습니다</p>
          <p className="text-sm text-theme-text-sub">링크를 공유해서 사람들을 초대해주세요</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-theme-surface rounded-lg shadow-md border border-theme-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-theme-border bg-theme-bg">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-theme-text-main sticky left-0 bg-theme-bg">
                      이름
                    </th>
                    {dates.map((date) => {
                      const dateString = formatDate(date);
                      const day = getDayOfWeek(date);
                      const isCommon = commonDates.has(dateString);

                      return (
                        <th
                          key={dateString}
                          className={`px-4 py-4 text-center text-sm font-semibold min-w-[80px] ${
                            isCommon ? 'bg-theme-success-soft' : ''
                          }`}
                        >
                          <div className="text-xs text-theme-text-sub mb-1">{day}</div>
                          <div className="font-semibold">{date.getDate()}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {userAvailabilities.map((user) => (
                    <tr key={user.userName} className="border-b border-theme-border">
                      <td className="px-6 py-4 text-sm font-medium text-theme-text-main sticky left-0 bg-theme-surface">
                        {user.userName}
                      </td>
                      {dates.map((date) => {
                        const dateString = formatDate(date);
                        const isAvailable = user.availableDates.has(dateString);
                        const isCommon = commonDates.has(dateString);

                        return (
                          <td
                            key={`${user.userName}-${dateString}`}
                            className={`px-4 py-4 text-center text-sm ${
                              isCommon ? 'bg-theme-success-soft' : ''
                            }`}
                          >
                            {isAvailable ? (
                              <span className="inline-block w-6 h-6 bg-theme-primary rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">✓</span>
                              </span>
                            ) : (
                              <span className="text-theme-text-sub">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {commonDates.size > 0 && (
            <div className="bg-theme-success-soft rounded-lg border border-theme-success p-6">
              <h2 className="text-lg font-semibold text-theme-success mb-4">모두 가능한 날짜</h2>
              <div className="flex flex-wrap gap-3">
                {Array.from(commonDates)
                  .sort()
                  .map((dateString) => {
                    const date = new Date(dateString + 'T00:00:00');
                    const day = getDayOfWeek(date);

                    return (
                      <div
                        key={dateString}
                        className="bg-theme-success text-white px-4 py-2 rounded-lg font-medium text-sm"
                      >
                        {date.getMonth() + 1}월 {date.getDate()}일 ({day})
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

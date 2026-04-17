/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { 
  format, 
  addDays, 
  parseISO, 
  eachDayOfInterval, 
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'motion/react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Share2, 
  Users, 
  Check, 
  ArrowLeft,
  Info,
  LogIn,
  LogOut
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for Tailwind classes */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Room {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  createdAt: Timestamp;
}

interface Response {
  id: string;
  roomId: string;
  userName: string;
  availableDates: string[]; // ['YYYY-MM-DD', ...]
  createdAt: Timestamp;
}

// --- Components ---

/** Error Boundary Fallback (Simplified) */
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-red-50">
      <div className="max-w-md p-6 bg-white rounded-2xl shadow-xl border border-red-100">
        <h2 className="text-xl font-bold text-red-600 mb-2">문제가 발생했습니다</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <button 
          onClick={() => window.location.href = window.location.origin}
          className="w-full py-2 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Home state
  const [step, setStep] = useState<'create' | 'view'>('create');
  
  // Create Room state
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [creating, setCreating] = useState(false);

  // Respond state
  const [userName, setUserName] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Initialize
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rId = params.get('room');
    if (rId) {
      setRoomId(rId);
      setStep('view');
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
      alert("구글 로그인에 실패했습니다. 팝업 차단 여부를 확인해주세요.");
    }
  };

  const handleLogout = () => signOut(auth);

  // Fetch Room & Responses
  useEffect(() => {
    if (!roomId || !user) return;

    setLoading(true);
    const roomRef = doc(db, 'rooms', roomId);
    
    // Use onSnapshot for real-time updates
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoom({
          id: docSnap.id,
          title: data.title,
          startDate: data.startDate,
          endDate: data.endDate,
          createdAt: data.createdAt
        });
      } else {
        setError("방을 찾을 수 없습니다.");
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`));

    const responsesRef = collection(db, 'rooms', roomId, 'responses');
    const unsubResponses = onSnapshot(responsesRef, (snapshot) => {
      const resps = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Response[];
      setResponses(resps);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `rooms/${roomId}/responses`));

    return () => {
      unsubRoom();
      unsubResponses();
    };
  }, [roomId, user]);

  // Actions
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle || !startDate || !endDate) return;
    
    setCreating(true);
    try {
      const roomData = {
        title: newRoomTitle,
        startDate,
        endDate,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'rooms'), roomData);
      const url = new URL(window.location.href);
      url.searchParams.set('room', docRef.id);
      window.history.pushState({}, '', url);
      setRoomId(docRef.id);
      setStep('view');
    } catch (err) {
      console.error(err);
      alert("방 생성 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !roomId) return;
    if (selectedDates.length === 0) {
      alert("최소 하루 이상 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const responseData = {
        roomId,
        userName,
        availableDates: selectedDates,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'rooms', roomId, 'responses'), responseData);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("응답 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("링크가 복사되었습니다!");
  };

  // Calculations
  const dateRange = useMemo(() => {
    if (!room) return [];
    try {
      return eachDayOfInterval({
        start: parseISO(room.startDate),
        end: parseISO(room.endDate)
      });
    } catch {
      return [];
    }
  }, [room]);

  const availabilityHeatmap = useMemo(() => {
    const map: Record<string, number> = {};
    responses.forEach(r => {
      r.availableDates.forEach(d => {
        map[d] = (map[d] || 0) + 1;
      });
    });
    return map;
  }, [responses]);

  const allPossibleDates = useMemo(() => {
    if (responses.length === 0) return [];
    const count = responses.length;
    return Object.keys(availabilityHeatmap).filter(d => availabilityHeatmap[d] === count);
  }, [availabilityHeatmap, responses.length]);

  const toggleDate = (dateStr: string) => {
    setSelectedDates(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  // --- Views ---

  if (loading && !room) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-theme-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-theme-bg text-theme-text-main font-sans flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-xl shadow-lg p-8 text-center"
        >
          <div className="text-4xl mb-4">📅</div>
          <h1 className="text-2xl font-extrabold text-theme-primary mb-2">Catch-Up</h1>
          <p className="text-sm text-theme-text-sub mb-8">로그인 후 약속을 정해보세요!</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-theme-surface border border-theme-border rounded-lg font-bold hover:bg-theme-bg transition-colors shadow-sm"
          >
            <LogIn size={20} className="text-theme-primary" />
            Google로 시작하기
          </button>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  // 1. Create View
  if (step === 'create' && !roomId) {
    return (
      <div className="min-h-screen bg-theme-bg text-theme-text-main font-sans flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-theme-surface border border-theme-border rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-8 border-b border-theme-border bg-theme-bg/50">
            <h1 className="text-2xl font-extrabold text-theme-primary flex items-center gap-2">
              📅 <span className="tracking-tight">Catch-Up</span>
            </h1>
            <p className="text-sm text-theme-text-sub mt-1">대학생 약속 조율의 새로운 기준</p>
          </div>
          
          <form onSubmit={handleCreateRoom} className="p-8 space-y-6">
            <div>
              <label className="block text-xs font-bold text-theme-text-sub uppercase mb-2">방 제목</label>
              <input 
                id="room-title-input"
                required
                type="text" 
                placeholder="예: 강릉 MT 가보자고! 🌊"
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                className="w-full px-4 py-3 bg-theme-bg border border-theme-border rounded-lg focus:ring-2 focus:ring-theme-primary focus:border-theme-primary outline-none transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-theme-text-sub uppercase mb-2">시작일</label>
                <input 
                  id="start-date-input"
                  required
                  type="date" 
                  value={startDate}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-theme-bg border border-theme-border rounded-lg focus:ring-2 focus:ring-theme-primary outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-theme-text-sub uppercase mb-2">종료일</label>
                <input 
                  id="end-date-input"
                  required
                  type="date" 
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-theme-bg border border-theme-border rounded-lg focus:ring-2 focus:ring-theme-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            <button 
              id="create-room-btn"
              disabled={creating}
              type="submit"
              className={cn(
                "w-full py-4 rounded-lg font-bold text-base transition-all transform active:scale-[0.99] shadow-sm",
                creating ? "bg-slate-300 cursor-not-allowed" : "bg-theme-primary text-white hover:bg-blue-600"
              )}
            >
              {creating ? "생성 중..." : "방 만들기 (링크 자동 공유)"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // 2. Room View (Respond & Results)
  if (room) {
    return (
      <div className="flex flex-col h-screen bg-theme-bg text-theme-text-main font-sans overflow-hidden">
        {/* Header (fixed 72px) */}
        <header className="h-[72px] bg-theme-surface border-b border-theme-border px-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-10">
            <div className="text-xl font-extrabold text-theme-primary flex items-center gap-2">📅 Catch-Up</div>
            <div className="flex items-center gap-4">
              <span className="bg-theme-primary-soft text-theme-primary px-2.5 py-1 rounded font-bold text-xs">모집 중</span>
              <h1 className="text-lg font-bold truncate max-w-md">{room.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="p-2 text-theme-text-sub hover:text-theme-primary transition-colors"
              title="로그아웃"
            >
              <LogOut size={18} />
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 border border-theme-primary text-theme-primary rounded-lg font-bold text-sm hover:bg-theme-primary-soft transition-colors"
            >
              <Share2 size={16} /> 링크 공유
            </button>
          </div>
        </header>

        {/* Main Grid */}
        <main className="flex-1 grid grid-cols-[1fr_340px] overflow-hidden">
          {/* Calendar Section */}
          <section className="bg-theme-surface border-r border-theme-border overflow-y-auto p-10 custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <div className="text-2xl font-bold">
                {format(parseISO(room.startDate), 'yyyy년 M월')}
              </div>
              <div className="text-sm text-theme-text-sub font-medium">전체 {responses.length}명 응답</div>
            </div>

            <div className="geometric-grid grid grid-cols-7">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                <div key={day} className="geometric-cell bg-slate-50 py-3 text-center text-xs font-bold text-theme-text-sub">
                  {day}
                </div>
              ))}
              
              {dateRange.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isSelected = selectedDates.includes(dateStr);
                const count = availabilityHeatmap[dateStr] || 0;
                const isAll = responses.length > 0 && count === responses.length;
                
                return (
                  <button
                    key={dateStr}
                    disabled={submitted}
                    onClick={() => toggleDate(dateStr)}
                    className={cn(
                      "geometric-cell h-[100px] p-2 text-left group relative",
                      isAll ? "bg-theme-success-soft" : "hover:bg-slate-50",
                      isSelected && !isAll ? "bg-theme-primary-soft" : ""
                    )}
                  >
                    <div className={cn(
                      "text-sm font-semibold",
                      isAll ? "text-theme-success" : "text-theme-text-main"
                    )}>
                      {format(date, 'd')}
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      {count > 0 && (
                        <>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isAll ? "bg-theme-success" : "bg-theme-primary"
                              )} 
                              style={{ width: `${(count / (responses.length || 1)) * 100}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold",
                            isAll ? "text-theme-success" : "text-theme-text-sub"
                          )}>
                            {isAll ? `모두 가능 (${count}명)` : `${count}명 가능`}
                          </span>
                        </>
                      )}
                    </div>

                    {isSelected && !isAll && (
                      <div className="absolute top-2 right-2 text-theme-primary">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Response Form (Bottom of Calendar Section) */}
            {!submitted && (
              <div className="mt-10 p-8 border border-theme-border rounded-xl bg-slate-50 shadow-inner">
                <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                  <Plus size={18} className="text-theme-primary" /> 내 일정 응답하기
                </h3>
                <div className="flex gap-4">
                  <input 
                    required
                    type="text" 
                    placeholder="이름 입력"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="flex-1 px-4 py-3 bg-theme-surface border border-theme-border rounded-lg focus:ring-2 focus:ring-theme-primary outline-none font-bold"
                  />
                  <button 
                    onClick={handleSubmitResponse}
                    disabled={submitting || !userName || selectedDates.length === 0}
                    className={cn(
                      "px-8 py-3 rounded-lg font-bold transition-all shadow-sm active:scale-[0.98]",
                      submitting || !userName || selectedDates.length === 0
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-theme-primary text-white hover:bg-blue-600"
                    )}
                  >
                    {submitting ? "제출 중..." : "제출 완료"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Side Panel */}
          <aside className="bg-slate-50/50 p-8 flex flex-col gap-10 overflow-y-auto custom-scrollbar">
            {/* Best Dates */}
            <div>
              <h2 className="text-sm font-bold text-theme-text-sub uppercase tracking-wider mb-4 flex items-center justify-between">
                🏆 최적의 날짜
              </h2>
              <div className="bg-theme-surface border border-theme-border rounded-xl p-5 space-y-4 shadow-sm">
                {allPossibleDates.length > 0 ? (
                  allPossibleDates.slice(0, 3).map(dateStr => (
                    <div key={dateStr} className="flex justify-between items-center text-sm">
                      <span className="font-bold">{format(parseISO(dateStr), 'M월 d일 (eee)', { locale: ko })}</span>
                      <span className="text-theme-success font-extrabold">{responses.length}/{responses.length} 완벽!</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-xs text-theme-text-sub italic">
                    {responses.length === 0 ? "응답을 기다리고 있습니다." : "전원 가능한 날짜가 아직 없습니다."}
                  </div>
                )}
              </div>
            </div>

            {/* Participants */}
            <div>
              <h2 className="text-sm font-bold text-theme-text-sub uppercase tracking-wider mb-4 flex items-center justify-between">
                👥 응답 현황 <span className="text-xs font-medium">{responses.length}명 응답</span>
              </h2>
              <ul className="space-y-3">
                {responses.map((res, i) => (
                  <li key={res.id} className="flex items-center gap-3 py-2 border-b border-theme-border/50">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm"
                      style={{ backgroundColor: `hsl(${(i * 137) % 360}, 65%, 50%)` }}
                    >
                      {res.userName.slice(0, 2)}
                    </div>
                    <span className="text-sm font-bold text-theme-text-main">{res.userName}</span>
                    <span className="ml-auto text-xs text-theme-text-sub">{res.availableDates.length}일 가능</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Small info */}
            <div className="mt-auto bg-theme-primary-soft/30 p-4 rounded-lg border border-theme-primary/10">
              <div className="flex gap-2">
                <Info size={14} className="text-theme-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-theme-primary font-medium leading-relaxed">
                  링크를 공유하여 더 많은 친구들의 일정을 확인해보세요! 실시간으로 반영됩니다.
                </p>
              </div>
            </div>
            
            {submitted && (
              <button 
                onClick={() => setSubmitted(false)}
                className="w-full py-4 border border-theme-primary text-theme-primary font-bold rounded-lg bg-theme-surface hover:bg-theme-primary-soft transition-colors"
              >
                내 일정 수정하기
              </button>
            )}
          </aside>
        </main>
      </div>
    );
  }

  return null;
}



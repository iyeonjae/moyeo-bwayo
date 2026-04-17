import React, { useState, useEffect } from 'react';
import { supabase } from './firebase';
import { CreateRoom } from './components/CreateRoom';
import { RoomCreatedSuccess } from './components/RoomCreatedSuccess';
import { ResponseScreen } from './components/ResponseScreen';
import { ResultScreen } from './components/ResultScreen';

type AppScreen = 'create' | 'success' | 'response' | 'result';

interface RoomData {
  id: string;
  shareCode: string;
  title: string;
  startDate: string;
  endDate: string;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('create');
  const [roomData, setRoomData] = useState<RoomData | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareCode = params.get('code');

    if (shareCode) {
      const fetchRoom = async () => {
        try {
          const { data, error } = await supabase
            .from('rooms')
            .select('id, title, start_date, end_date, share_code')
            .eq('share_code', shareCode)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setRoomData({
              id: data.id,
              shareCode: data.share_code,
              title: data.title,
              startDate: data.start_date,
              endDate: data.end_date,
            });
            setScreen('response');
          }
        } catch (error) {
          console.error('Failed to fetch room:', error);
        }
      };

      fetchRoom();
    }
  }, []);

  const handleRoomCreated = (roomId: string, shareCode: string) => {
    setRoomData({
      id: roomId,
      shareCode,
      title: '',
      startDate: '',
      endDate: '',
    });
    setScreen('success');
  };

  const handleContinueToResult = () => {
    if (roomData) {
      setScreen('result');
    }
  };

  const handleResponseSubmitted = () => {
    if (roomData) {
      setScreen('result');
    }
  };

  const handleBackToCreate = () => {
    setRoomData(null);
    setScreen('create');
  };

  return (
    <div className="min-h-screen bg-theme-bg">
      {screen === 'create' && (
        <CreateRoom onRoomCreated={handleRoomCreated} />
      )}

      {screen === 'success' && roomData && (
        <RoomCreatedSuccess
          shareCode={roomData.shareCode}
          onContinue={handleContinueToResult}
        />
      )}

      {screen === 'response' && roomData && (
        <ResponseScreen
          roomId={roomData.id}
          startDate={roomData.startDate}
          endDate={roomData.endDate}
          onResponseSubmitted={handleResponseSubmitted}
        />
      )}

      {screen === 'result' && roomData && (
        <ResultScreen
          roomId={roomData.id}
          startDate={roomData.startDate}
          endDate={roomData.endDate}
          title={roomData.title}
        />
      )}
    </div>
  );
}
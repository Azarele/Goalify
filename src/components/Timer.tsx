import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  timeRemaining: number;
  onTimeUpdate: (time: number) => void;
  isActive: boolean;
}

export const Timer: React.FC<TimerProps> = ({ timeRemaining, onTimeUpdate, isActive }) => {
  const [time, setTime] = useState(timeRemaining);

  useEffect(() => {
    setTime(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTime(prevTime => {
        const newTime = Math.max(0, prevTime - 1);
        onTimeUpdate(newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUpdate]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    return ((timeRemaining - time) / timeRemaining) * 100;
  };

  return (
    <div className="flex items-center space-x-3 bg-white rounded-lg p-4 shadow-sm border">
      <Clock className="w-5 h-5 text-blue-600" />
      <div className="flex-1">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Session Progress</span>
          <span className="text-lg font-bold text-blue-600">{formatTime(time)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Flame, Calendar } from 'lucide-react';

interface DailyStreakIndicatorProps {
  streak: number;
  lastActivity: Date | null;
}

export const DailyStreakIndicator: React.FC<DailyStreakIndicatorProps> = ({ 
  streak, 
  lastActivity 
}) => {
  const isActiveToday = lastActivity && 
    new Date().toDateString() === lastActivity.toDateString();

  const getStreakColor = () => {
    if (streak === 0) return 'text-gray-400';
    if (streak < 3) return 'text-orange-400';
    if (streak < 7) return 'text-yellow-400';
    if (streak < 14) return 'text-green-400';
    return 'text-purple-400';
  };

  const getStreakMessage = () => {
    if (streak === 0) return 'Start your streak!';
    if (streak === 1) return 'Great start!';
    if (streak < 7) return 'Building momentum!';
    if (streak < 14) return 'On fire! 🔥';
    return 'Unstoppable! 🚀';
  };

  return (
    <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-4 border border-purple-500/20 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            streak > 0 ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gray-600'
          }`}>
            <Flame className={`w-6 h-6 ${streak > 0 ? 'text-white' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-2xl font-bold ${getStreakColor()}`}>
                {streak}
              </span>
              <span className="text-purple-300 text-sm">day streak</span>
            </div>
            <p className="text-xs text-purple-400">{getStreakMessage()}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center space-x-1 text-xs text-purple-300">
            <Calendar className="w-3 h-3" />
            <span>
              {isActiveToday ? 'Active today' : 'Last: ' + (lastActivity?.toLocaleDateString() || 'Never')}
            </span>
          </div>
          {!isActiveToday && streak > 0 && (
            <p className="text-xs text-yellow-400 mt-1">
              Complete a goal today to continue your streak!
            </p>
          )}
        </div>
      </div>
      
      {/* Streak Progress Bar */}
      <div className="mt-3">
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              streak > 0 
                ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                : 'bg-gray-600'
            }`}
            style={{ width: `${Math.min((streak / 30) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-purple-400 mt-1">
          <span>0</span>
          <span>30 days</span>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Crown, Trophy, Star, Medal, Award, Users, TrendingUp, Zap, Target, Flame, BarChart3, Loader } from 'lucide-react';
import { UserProfile } from '../types/coaching';
import { getGlobalLeaderboard, getUserRank } from '../services/database';
import { useAuth } from '../hooks/useAuth';

interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  totalXP: number;
  goalsCompleted: number;
  goalsCreated: number;
  dailyStreak: number;
  highestStreak: number;
  totalSessions: number;
  completionRate: number;
  rank: number;
}

interface GlobalLeaderboardProps {
  userProfile: UserProfile | null;
}

export const GlobalLeaderboard: React.FC<GlobalLeaderboardProps> = ({ userProfile }) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'xp' | 'goals' | 'streak'>('xp');
  const [userRank, setUserRank] = useState<{
    rankByXP: number;
    rankByGoals: number;
    rankByStreak: number;
    totalUsers: number;
  } | null>(null);

  useEffect(() => {
    loadLeaderboard();
    if (user) {
      loadUserRank();
    }
  }, [sortBy, user]);

  const loadLeaderboard = async () => {
    setLoading(true);
    
    try {
      console.log('Loading real leaderboard data...');
      const leaderboardData = await getGlobalLeaderboard(sortBy, 50);
      setLeaderboard(leaderboardData);
      console.log('Leaderboard loaded:', leaderboardData.length, 'users');
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRank = async () => {
    if (!user) return;
    
    try {
      const rankData = await getUserRank(user.id);
      setUserRank(rankData);
    } catch (error) {
      console.error('Error loading user rank:', error);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-400" />;
      default:
        return <span className="text-purple-300 font-bold text-sm">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
      case 2:
        return 'from-gray-400/20 to-gray-500/20 border-gray-400/30';
      case 3:
        return 'from-orange-500/20 to-red-500/20 border-orange-500/30';
      default:
        return 'from-slate-700/30 to-purple-800/30 border-slate-600/30';
    }
  };

  const getCurrentUserRank = () => {
    if (!user) return 0;
    const userEntry = leaderboard.find(entry => entry.id === user.id);
    return userEntry ? userEntry.rank : 0;
  };

  const getSortIcon = (sortType: string) => {
    switch (sortType) {
      case 'xp':
        return <Star className="w-4 h-4" />;
      case 'goals':
        return <Target className="w-4 h-4" />;
      case 'streak':
        return <Flame className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getSortLabel = (sortType: string) => {
    switch (sortType) {
      case 'xp':
        return 'Total XP';
      case 'goals':
        return 'Goals Completed';
      case 'streak':
        return 'Highest Streak';
      default:
        return 'Total XP';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Loader className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-purple-300">Loading global leaderboard...</p>
        </div>
      </div>
    );
  }

  const currentUserRank = getCurrentUserRank();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Global Leaderboard</h3>
            <p className="text-purple-300 text-sm">Real-time rankings from all users</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300 text-sm">{leaderboard.length} active users</span>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['xp', 'goals', 'streak'] as const).map((sortType) => (
          <button
            key={sortType}
            onClick={() => setSortBy(sortType)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              sortBy === sortType
                ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 border border-purple-400/50'
                : 'bg-slate-700/30 text-purple-300 hover:bg-slate-600/40 border border-slate-600/30'
            }`}
          >
            {getSortIcon(sortType)}
            <span className="text-sm">{getSortLabel(sortType)}</span>
          </button>
        ))}
      </div>

      {/* Current User Highlight */}
      {currentUserRank > 0 && userProfile && (
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getRankIcon(currentUserRank)}
                <span className="text-white font-medium">Your Rank: #{currentUserRank}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="text-center">
                <div className="text-white font-bold">Level {userProfile.level || 1}</div>
                <div className="text-purple-300 text-xs">Level</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">{userProfile.totalXP || 0}</div>
                <div className="text-purple-300 text-xs">XP</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">{userProfile.dailyStreak || 0}</div>
                <div className="text-purple-300 text-xs">Streak</div>
              </div>
            </div>
          </div>
          
          {userRank && (
            <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
              <div className="text-center">
                <div className="text-purple-200">XP Rank: #{userRank.rankByXP}</div>
              </div>
              <div className="text-center">
                <div className="text-purple-200">Goals Rank: #{userRank.rankByGoals}</div>
              </div>
              <div className="text-center">
                <div className="text-purple-200">Streak Rank: #{userRank.rankByStreak}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-white mb-2">No rankings yet</h3>
            <p className="text-purple-300">Be the first to complete goals and climb the leaderboard!</p>
          </div>
        ) : (
          leaderboard.map((entry) => (
            <div
              key={entry.id}
              className={`p-4 rounded-lg border transition-all duration-300 ${
                user && entry.id === user.id
                  ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/50 ring-2 ring-purple-400/30'
                  : `bg-gradient-to-r ${getRankColor(entry.rank)} hover:bg-opacity-80`
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8">
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      entry.rank <= 3 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                    }`}>
                      <span className="text-white font-bold text-sm">
                        {entry.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${user && entry.id === user.id ? 'text-purple-200' : 'text-white'}`}>
                          {entry.name}
                          {user && entry.id === user.id && (
                            <span className="ml-2 text-xs bg-purple-500/30 text-purple-200 px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-purple-300">
                        Level {entry.level} • {entry.totalXP} XP • {entry.completionRate}% success rate
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-purple-400" />
                      <span className="text-white font-medium">{entry.totalXP}</span>
                    </div>
                    <div className="text-purple-300 text-xs">XP</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <Target className="w-3 h-3 text-green-400" />
                      <span className="text-white font-medium">{entry.goalsCompleted}</span>
                    </div>
                    <div className="text-purple-300 text-xs">Goals</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span className="text-white font-medium">{entry.highestStreak}</span>
                    </div>
                    <div className="text-purple-300 text-xs">Best Streak</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3 text-blue-400" />
                      <span className="text-white font-medium">{entry.totalSessions}</span>
                    </div>
                    <div className="text-purple-300 text-xs">Sessions</div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-purple-400">
          <Users className="w-4 h-4" />
          <span>Real-time rankings • Updated automatically</span>
        </div>
        <p className="text-xs text-purple-500 mt-2">
          Complete goals, maintain streaks, and engage regularly to climb the leaderboard!
        </p>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Crown, Trophy, Star, Medal, Award, Users, TrendingUp, Zap, Target, Flame, BarChart3, Loader, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [animatingRanks, setAnimatingRanks] = useState<Set<string>>(new Set());

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
      
      // Animate rank changes
      if (leaderboard.length > 0) {
        const changedRanks = new Set<string>();
        leaderboardData.forEach((newEntry, index) => {
          const oldEntry = leaderboard.find(old => old.id === newEntry.id);
          if (oldEntry && oldEntry.rank !== newEntry.rank) {
            changedRanks.add(newEntry.id);
          }
        });
        setAnimatingRanks(changedRanks);
        setTimeout(() => setAnimatingRanks(new Set()), 1000);
      }
      
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
        return (
          <div className="relative">
            <Crown className="w-6 h-6 text-yellow-400" />
            <div className="absolute inset-0 animate-pulse">
              <Crown className="w-6 h-6 text-yellow-300 opacity-50" />
            </div>
          </div>
        );
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-400" />;
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center border border-slate-500">
            <span className="text-purple-300 font-bold text-sm">#{rank}</span>
          </div>
        );
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-500/30 to-orange-500/30 border-yellow-500/50 shadow-yellow-500/20';
      case 2:
        return 'from-gray-400/30 to-gray-500/30 border-gray-400/50 shadow-gray-400/20';
      case 3:
        return 'from-orange-500/30 to-red-500/30 border-orange-500/50 shadow-orange-500/20';
      default:
        return 'from-slate-700/30 to-purple-800/30 border-slate-600/30 hover:border-purple-500/30';
    }
  };

  const getCurrentUserRank = () => {
    if (!user) return 0;
    const userEntry = leaderboard.find(entry => entry.id === user.id);
    return userEntry ? userEntry.rank : 0;
  };

  const getSortIcon = (sortType: string) => {
    const isActive = sortBy === sortType;
    const iconClass = `w-4 h-4 transition-all duration-300 ${isActive ? 'text-purple-300' : 'text-slate-400'}`;
    
    switch (sortType) {
      case 'xp':
        return <Star className={iconClass} />;
      case 'goals':
        return <Target className={iconClass} />;
      case 'streak':
        return <Flame className={iconClass} />;
      default:
        return <BarChart3 className={iconClass} />;
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

  const getRankChange = (entry: LeaderboardEntry) => {
    if (animatingRanks.has(entry.id)) {
      return (
        <div className="flex items-center space-x-1 text-xs">
          <ChevronUp className="w-3 h-3 text-green-400 animate-bounce" />
          <span className="text-green-400 font-medium">↑</span>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full animate-ping opacity-20"></div>
          </div>
          <Loader className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-purple-300 text-lg">Loading global leaderboard...</p>
          <p className="text-purple-400 text-sm mt-2">Fetching real-time rankings...</p>
        </div>
      </div>
    );
  }

  const currentUserRank = getCurrentUserRank();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full animate-ping opacity-20"></div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">🏆 Global Champions</h3>
            <p className="text-purple-300">Real-time rankings from all users worldwide</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-3 border border-purple-500/20">
          <Users className="w-5 h-5 text-purple-400" />
          <div className="text-center">
            <div className="text-lg font-bold text-white">{leaderboard.length}</div>
            <div className="text-xs text-purple-300">Active Champions</div>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap gap-3 mb-8">
        {(['xp', 'goals', 'streak'] as const).map((sortType) => (
          <button
            key={sortType}
            onClick={() => setSortBy(sortType)}
            className={`group flex items-center space-x-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
              sortBy === sortType
                ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 border border-purple-400/50 shadow-lg shadow-purple-500/20'
                : 'bg-slate-700/30 text-purple-300 hover:bg-slate-600/40 border border-slate-600/30 hover:border-purple-500/30'
            }`}
          >
            {getSortIcon(sortType)}
            <span>{getSortLabel(sortType)}</span>
            {sortBy === sortType && (
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            )}
          </button>
        ))}
      </div>

      {/* Current User Highlight */}
      {currentUserRank > 0 && userProfile && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {getRankIcon(currentUserRank)}
                {currentUserRank <= 3 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-bold text-lg">Your Rank: #{currentUserRank}</span>
                  {currentUserRank <= 10 && (
                    <div className="px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30">
                      <span className="text-yellow-300 text-xs font-medium">TOP 10!</span>
                    </div>
                  )}
                </div>
                <p className="text-purple-300 text-sm">
                  {userProfile.name || 'Anonymous Champion'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-white">Level {userProfile.level || 1}</div>
                <div className="text-purple-300 text-xs">Level</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">{userProfile.totalXP || 0}</div>
                <div className="text-purple-300 text-xs">XP</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-400">{userProfile.dailyStreak || 0}</div>
                <div className="text-purple-300 text-xs">Streak</div>
              </div>
            </div>
          </div>
          
          {userRank && (
            <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
              <div className="text-center p-2 bg-slate-700/30 rounded-lg">
                <div className="text-purple-200 font-medium">XP Rank</div>
                <div className="text-lg font-bold text-white">#{userRank.rankByXP}</div>
              </div>
              <div className="text-center p-2 bg-slate-700/30 rounded-lg">
                <div className="text-purple-200 font-medium">Goals Rank</div>
                <div className="text-lg font-bold text-white">#{userRank.rankByGoals}</div>
              </div>
              <div className="text-center p-2 bg-slate-700/30 rounded-lg">
                <div className="text-purple-200 font-medium">Streak Rank</div>
                <div className="text-lg font-bold text-white">#{userRank.rankByStreak}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-3">
        {leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <Trophy className="w-20 h-20 text-purple-400 mx-auto opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-10"></div>
            </div>
            <h3 className="text-2xl font-medium text-white mb-3">No champions yet</h3>
            <p className="text-purple-300 mb-6">Be the first to complete goals and claim the crown!</p>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm">Start your journey to the top!</span>
            </div>
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`group p-6 rounded-xl border transition-all duration-500 transform hover:scale-[1.02] ${
                user && entry.id === user.id
                  ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/50 ring-2 ring-purple-400/30 shadow-xl shadow-purple-500/20'
                  : `bg-gradient-to-r ${getRankColor(entry.rank)} hover:shadow-xl`
              } ${animatingRanks.has(entry.id) ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3">
                    {getRankIcon(entry.rank)}
                    {getRankChange(entry)}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                      entry.rank <= 3 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                        : 'bg-gradient-to-br from-purple-500 to-pink-500'
                    }`}>
                      <span className="text-white font-bold text-lg">
                        {(entry.name || 'Anonymous').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className={`font-bold text-lg ${user && entry.id === user.id ? 'text-purple-200' : 'text-white'}`}>
                          {entry.name || 'Anonymous Champion'}
                          {user && entry.id === user.id && (
                            <span className="ml-3 text-xs bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full font-medium">
                              YOU
                            </span>
                          )}
                        </span>
                        {entry.rank <= 3 && (
                          <div className="flex items-center space-x-1">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-300 text-xs font-medium">CHAMPION</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-purple-300 mt-1">
                        <span>Level {entry.level}</span>
                        <span>•</span>
                        <span>{entry.totalXP} XP</span>
                        <span>•</span>
                        <span>{entry.completionRate}% success rate</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-8 text-sm">
                  <div className="text-center group-hover:scale-110 transition-transform duration-300">
                    <div className="flex items-center space-x-1 mb-1">
                      <Star className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-bold text-lg">{entry.totalXP}</span>
                    </div>
                    <div className="text-purple-300 text-xs">XP</div>
                  </div>
                  
                  <div className="text-center group-hover:scale-110 transition-transform duration-300">
                    <div className="flex items-center space-x-1 mb-1">
                      <Target className="w-4 h-4 text-green-400" />
                      <span className="text-white font-bold text-lg">{entry.goalsCompleted}</span>
                    </div>
                    <div className="text-purple-300 text-xs">Goals</div>
                  </div>
                  
                  <div className="text-center group-hover:scale-110 transition-transform duration-300">
                    <div className="flex items-center space-x-1 mb-1">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-white font-bold text-lg">{entry.highestStreak}</span>
                    </div>
                    <div className="text-purple-300 text-xs">Best Streak</div>
                  </div>
                  
                  <div className="text-center group-hover:scale-110 transition-transform duration-300">
                    <div className="flex items-center space-x-1 mb-1">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-bold text-lg">{entry.totalSessions}</span>
                    </div>
                    <div className="text-purple-300 text-xs">Sessions</div>
                  </div>
                </div>
              </div>
              
              {/* Rank-specific effects */}
              {entry.rank === 1 && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-300 text-sm font-medium">👑 REIGNING CHAMPION 👑</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-purple-400 mb-3">
          <Users className="w-4 h-4" />
          <span>Real-time rankings • Updated automatically</span>
        </div>
        <p className="text-xs text-purple-500">
          🏆 Complete goals, maintain streaks, and engage regularly to climb the leaderboard!
        </p>
        <div className="mt-4 flex items-center justify-center space-x-6 text-xs text-purple-400">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Top 3 Champions</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span>Rising Stars</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live Updates</span>
          </div>
        </div>
      </div>
    </div>
  );
};
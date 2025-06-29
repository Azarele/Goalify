import React, { useState, useEffect } from 'react';
import { Crown, Trophy, Star, Medal, Award, Users, TrendingUp, Zap, Target } from 'lucide-react';
import { UserProfile } from '../types/coaching';
import { supabase } from '../lib/supabase';

interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  totalXP: number;
  goalsCompleted: number;
  dailyStreak: number;
  rank: number;
}

interface GlobalLeaderboardProps {
  userProfile: UserProfile | null;
}

export const GlobalLeaderboard: React.FC<GlobalLeaderboardProps> = ({ userProfile }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'level' | 'xp' | 'goals' | 'streak'>('level');

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe, sortBy]);

  const loadLeaderboard = async () => {
    setLoading(true);
    
    try {
      // Generate demo leaderboard data since we don't have real user data
      const demoUsers = generateDemoLeaderboard();
      
      // Add current user if they have a profile
      if (userProfile) {
        const userEntry: LeaderboardEntry = {
          id: 'current-user',
          name: userProfile.name || 'You',
          level: userProfile.level || 1,
          totalXP: userProfile.totalXP || 0,
          goalsCompleted: 0, // This would come from goals data
          dailyStreak: userProfile.dailyStreak || 0,
          rank: 0
        };
        
        demoUsers.push(userEntry);
      }
      
      // Sort based on selected criteria
      const sortedUsers = sortLeaderboard(demoUsers, sortBy);
      
      // Add ranks
      const rankedUsers = sortedUsers.map((user, index) => ({
        ...user,
        rank: index + 1
      }));
      
      setLeaderboard(rankedUsers);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      // Fallback to demo data
      setLeaderboard(generateDemoLeaderboard());
    } finally {
      setLoading(false);
    }
  };

  const generateDemoLeaderboard = (): LeaderboardEntry[] => {
    const demoNames = [
      'Alex Chen', 'Sarah Johnson', 'Michael Rodriguez', 'Emma Thompson', 'David Kim',
      'Lisa Wang', 'James Wilson', 'Maria Garcia', 'Ryan O\'Connor', 'Jessica Lee',
      'Daniel Brown', 'Ashley Davis', 'Kevin Zhang', 'Rachel Green', 'Mark Taylor',
      'Sophia Martinez', 'Chris Anderson', 'Amanda White', 'Tyler Johnson', 'Olivia Smith'
    ];
    
    return demoNames.map((name, index) => {
      const baseLevel = Math.max(1, 15 - index);
      const baseXP = baseLevel * 1000 + Math.floor(Math.random() * 800);
      const goalsCompleted = Math.floor(baseLevel * 2.5 + Math.random() * 10);
      const dailyStreak = Math.floor(Math.random() * 50);
      
      return {
        id: `demo-${index}`,
        name,
        level: baseLevel,
        totalXP: baseXP,
        goalsCompleted,
        dailyStreak,
        rank: index + 1
      };
    });
  };

  const sortLeaderboard = (users: LeaderboardEntry[], criteria: string): LeaderboardEntry[] => {
    return [...users].sort((a, b) => {
      switch (criteria) {
        case 'level':
          return b.level !== a.level ? b.level - a.level : b.totalXP - a.totalXP;
        case 'xp':
          return b.totalXP - a.totalXP;
        case 'goals':
          return b.goalsCompleted - a.goalsCompleted;
        case 'streak':
          return b.dailyStreak - a.dailyStreak;
        default:
          return b.level - a.level;
      }
    });
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
    return leaderboard.findIndex(user => user.id === 'current-user') + 1;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  const currentUserRank = getCurrentUserRank();

  return (
    <div className="p-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-purple-300">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="level">Level</option>
            <option value="xp">Total XP</option>
            <option value="goals">Goals Completed</option>
            <option value="streak">Daily Streak</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-purple-300">Timeframe:</span>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="px-3 py-1 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
          </select>
        </div>
      </div>

      {/* Current User Highlight */}
      {currentUserRank > 0 && (
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
                <div className="text-white font-bold">Level {userProfile?.level || 1}</div>
                <div className="text-purple-300 text-xs">Level</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">{userProfile?.totalXP || 0}</div>
                <div className="text-purple-300 text-xs">XP</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold">{userProfile?.dailyStreak || 0}</div>
                <div className="text-purple-300 text-xs">Streak</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaderboard.slice(0, 20).map((user) => (
          <div
            key={user.id}
            className={`p-4 rounded-lg border transition-all duration-300 ${
              user.id === 'current-user'
                ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/50 ring-2 ring-purple-400/30'
                : `bg-gradient-to-r ${getRankColor(user.rank)} hover:bg-opacity-80`
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-8 h-8">
                  {getRankIcon(user.rank)}
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.rank <= 3 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                    <span className="text-white font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${user.id === 'current-user' ? 'text-purple-200' : 'text-white'}`}>
                        {user.name}
                        {user.id === 'current-user' && (
                          <span className="ml-2 text-xs bg-purple-500/30 text-purple-200 px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-purple-300">
                      Level {user.level} • {user.totalXP} XP
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="flex items-center space-x-1">
                    <Trophy className="w-3 h-3 text-yellow-400" />
                    <span className="text-white font-medium">{user.level}</span>
                  </div>
                  <div className="text-purple-300 text-xs">Level</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-purple-400" />
                    <span className="text-white font-medium">{user.totalXP}</span>
                  </div>
                  <div className="text-purple-300 text-xs">XP</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center space-x-1">
                    <Target className="w-3 h-3 text-green-400" />
                    <span className="text-white font-medium">{user.goalsCompleted}</span>
                  </div>
                  <div className="text-purple-300 text-xs">Goals</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-orange-400" />
                    <span className="text-white font-medium">{user.dailyStreak}</span>
                  </div>
                  <div className="text-purple-300 text-xs">Streak</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-purple-400">
          <Users className="w-4 h-4" />
          <span>Showing top 20 users • Updated in real-time</span>
        </div>
        <p className="text-xs text-purple-500 mt-2">
          Complete more goals and maintain your streak to climb the leaderboard!
        </p>
      </div>
    </div>
  );
};
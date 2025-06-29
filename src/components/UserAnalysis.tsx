import React, { useState, useEffect } from 'react';
import { BarChart3, Target, TrendingUp, Calendar, CheckCircle, Star, Trophy, Award, Zap, Flame, Brain, Activity } from 'lucide-react';
import { getUserSessions, getUserConversations } from '../services/database';
import { generateUserAnalysis } from '../services/openai';
import { UserProfile } from '../types/coaching';
import { useAuth } from '../hooks/useAuth';
import { useGoals } from '../hooks/useGoals';

interface UserAnalysisProps {
  userProfile: UserProfile | null;
}

interface AnalysisData {
  totalGoals: number;
  completedGoals: number;
  totalConversations: number;
  dailyStreak: number;
  level: number;
  totalXP: number;
  recentGoals: Array<{ description: string; completed: boolean; difficulty: string; createdAt: Date }>;
  conversationTopics: string[];
  weeklyActivity: Array<{ date: string; count: number }>;
  streakHistory: Array<{ week: string; streak: number }>;
  goalsByDifficulty: { easy: number; medium: number; hard: number };
  completionByDifficulty: { easy: number; medium: number; hard: number };
}

export const UserAnalysis: React.FC<UserAnalysisProps> = ({ userProfile }) => {
  const { user } = useAuth();
  const { goals, loading: goalsLoading, getGoalStats } = useGoals();
  const [conversations, setConversations] = useState<any[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysisData();
  }, [user, goals]);

  const loadAnalysisData = async () => {
    if (!user || goalsLoading) {
      setLoading(false);
      return;
    }

    try {
      const conversationsData = await getUserConversations(user.id);
      setConversations(conversationsData);

      // Process data for analysis
      const goalStats = getGoalStats();
      const completedGoals = goals.filter(g => g.completed);
      const recentGoals = goals.slice(0, 10);
      
      // Generate conversation topics (simplified)
      const topics = conversationsData.map(c => {
        const title = c.title.toLowerCase();
        if (title.includes('career')) return 'Career';
        if (title.includes('health') || title.includes('fitness')) return 'Health';
        if (title.includes('relationship')) return 'Relationships';
        if (title.includes('productivity') || title.includes('time')) return 'Productivity';
        if (title.includes('stress') || title.includes('anxiety')) return 'Wellness';
        return 'Personal Growth';
      });

      // Generate weekly activity data (last 12 weeks)
      const weeklyActivity = generateWeeklyActivity(goals);
      
      // Generate streak history (simplified)
      const streakHistory = generateStreakHistory();

      const data: AnalysisData = {
        totalGoals: goalStats.total,
        completedGoals: goalStats.completed,
        totalConversations: conversationsData.length,
        dailyStreak: userProfile?.dailyStreak || 0,
        level: userProfile?.level || 1,
        totalXP: userProfile?.totalXP || 0,
        recentGoals: recentGoals.map(g => ({
          description: g.description,
          completed: g.completed,
          difficulty: g.difficulty,
          createdAt: g.createdAt
        })),
        conversationTopics: [...new Set(topics)],
        weeklyActivity,
        streakHistory,
        goalsByDifficulty: goalStats.goalsByDifficulty,
        completionByDifficulty: goalStats.completionByDifficulty
      };

      setAnalysisData(data);

      // Generate AI analysis
      const analysis = await generateUserAnalysis(data);
      setAiAnalysis(analysis);

    } catch (error) {
      console.error('Error loading analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklyActivity = (goals: any[]) => {
    const weeks = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      const weekGoals = goals.filter(g => {
        const goalDate = new Date(g.createdAt);
        return goalDate >= weekStart && goalDate < weekEnd;
      });

      weeks.push({
        date: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: weekGoals.length
      });
    }
    
    return weeks;
  };

  const generateStreakHistory = () => {
    // Simplified streak history - in a real app, this would come from stored data
    const weeks = [];
    const currentStreak = userProfile?.dailyStreak || 0;
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      
      weeks.push({
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        streak: Math.max(0, currentStreak - (i * 2) + Math.floor(Math.random() * 3))
      });
    }
    
    return weeks;
  };

  const getCompletionRate = () => {
    if (!analysisData || analysisData.totalGoals === 0) return 0;
    return Math.round((analysisData.completedGoals / analysisData.totalGoals) * 100);
  };

  const getActivityLevel = () => {
    if (!analysisData) return 'Getting Started';
    if (analysisData.totalConversations >= 20) return 'Highly Active';
    if (analysisData.totalConversations >= 10) return 'Active';
    if (analysisData.totalConversations >= 5) return 'Engaged';
    return 'Getting Started';
  };

  const getTopTopics = () => {
    if (!analysisData) return [];
    const topicCounts: { [key: string]: number } = {};
    
    analysisData.conversationTopics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
    
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([topic, count]) => ({ topic, count }));
  };

  if (loading || goalsLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">Analyzing your progress...</p>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center py-16">
          <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-2xl font-medium text-white mb-3">Not enough data yet</h3>
          <p className="text-purple-300">Complete a few more conversations and goals to see your analysis.</p>
        </div>
      </div>
    );
  }

  const completionRate = getCompletionRate();
  const activityLevel = getActivityLevel();
  const topTopics = getTopTopics();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="relative mx-auto w-16 h-16 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">🧠 My Analysis</h2>
        <p className="text-purple-300">Data-driven insights into your coaching journey</p>
      </div>

      {/* AI-Generated Summary */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-2xl p-8 border border-purple-500/20 backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">AI Analysis</h3>
            <p className="text-purple-300 text-sm">Personalized insights based on your data</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-6 border border-blue-500/20">
          <p className="text-white leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{completionRate}%</p>
              <p className="text-sm text-purple-300">Goal Completion</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{analysisData.dailyStreak}</p>
              <p className="text-sm text-purple-300">Current Streak</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{activityLevel}</p>
              <p className="text-sm text-purple-300">Activity Level</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{analysisData.level}</p>
              <p className="text-sm text-purple-300">Current Level</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Goal Completion Rate Pie Chart */}
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
          <div className="p-6 border-b border-purple-500/20">
            <h3 className="text-xl font-semibold text-white">Goal Completion Rate</h3>
          </div>
          
          <div className="p-6">
            <div className="relative w-48 h-48 mx-auto">
              <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="rgb(71 85 105)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${completionRate * 2.51} 251`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgb(168 85 247)" />
                    <stop offset="100%" stopColor="rgb(236 72 153)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{completionRate}%</div>
                  <div className="text-sm text-purple-300">Complete</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  <span className="text-white text-sm">Completed</span>
                </div>
                <span className="text-purple-300 text-sm">{analysisData.completedGoals}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                  <span className="text-white text-sm">Pending</span>
                </div>
                <span className="text-purple-300 text-sm">{analysisData.totalGoals - analysisData.completedGoals}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
          <div className="p-6 border-b border-purple-500/20">
            <h3 className="text-xl font-semibold text-white">Weekly Activity</h3>
          </div>
          
          <div className="p-6">
            <div className="space-y-3">
              {analysisData.weeklyActivity.map((week, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-16 text-xs text-purple-300">{week.date}</div>
                  <div className="flex-1 bg-slate-700 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (week.count / Math.max(...analysisData.weeklyActivity.map(w => w.count))) * 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">{week.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Streak History & Goal Difficulty */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Streak History */}
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
          <div className="p-6 border-b border-purple-500/20">
            <h3 className="text-xl font-semibold text-white">Streak History</h3>
          </div>
          
          <div className="p-6">
            <div className="flex items-end space-x-2 h-32">
              {analysisData.streakHistory.map((week, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-orange-500 to-red-500 rounded-t transition-all duration-500 min-h-[4px]"
                    style={{ height: `${(week.streak / Math.max(...analysisData.streakHistory.map(w => w.streak))) * 100}%` }}
                  />
                  <div className="text-xs text-purple-300 mt-2 transform -rotate-45 origin-left">
                    {week.week}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Goal Difficulty Breakdown */}
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
          <div className="p-6 border-b border-purple-500/20">
            <h3 className="text-xl font-semibold text-white">Goal Difficulty Analysis</h3>
          </div>
          
          <div className="p-6 space-y-4">
            {Object.entries(analysisData.goalsByDifficulty).map(([difficulty, total]) => {
              const completed = analysisData.completionByDifficulty[difficulty as keyof typeof analysisData.completionByDifficulty];
              const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
              const color = difficulty === 'easy' ? 'from-green-500 to-blue-500' : 
                           difficulty === 'medium' ? 'from-yellow-500 to-orange-500' : 
                           'from-red-500 to-pink-500';
              
              return (
                <div key={difficulty} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white capitalize font-medium">{difficulty}</span>
                    <span className="text-purple-300 text-sm">{completed}/{total} ({rate}%)</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div 
                      className={`h-3 bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Topics */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
        <div className="p-6 border-b border-purple-500/20">
          <h3 className="text-xl font-semibold text-white">Top Conversation Topics</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topTopics.map((topic, index) => (
              <div key={topic.topic} className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                    index === 1 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                    'bg-gradient-to-r from-blue-500 to-purple-500'
                  }`}>
                    <span className="text-white font-bold text-sm">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{topic.topic}</h4>
                    <p className="text-sm text-purple-300">{topic.count} conversations</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goal Summary Statistics */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
        <div className="p-6 border-b border-purple-500/20">
          <h3 className="text-xl font-semibold text-white">Goal Journey Summary</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">{analysisData.totalGoals}</div>
              <div className="text-sm text-purple-300">Total Goals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{analysisData.completedGoals}</div>
              <div className="text-sm text-purple-300">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{analysisData.totalGoals - analysisData.completedGoals}</div>
              <div className="text-sm text-purple-300">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{analysisData.totalXP}</div>
              <div className="text-sm text-purple-300">XP Earned</div>
            </div>
          </div>
          
          {analysisData.totalGoals > 0 && (
            <div className="mt-6">
              <div className="text-sm text-purple-300 mb-2 text-center">Your Goal Completion Journey</div>
              <div className="w-full bg-slate-700 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="text-center text-sm text-purple-300 mt-2">
                You've completed {completionRate}% of your goals - keep up the great work!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { BarChart3, Target, TrendingUp, Calendar, CheckCircle, Star, Trophy, Award, Zap, Flame } from 'lucide-react';
import { getUserConversations } from '../services/database';
import { UserProfile } from '../types/coaching';
import { useAuth } from '../hooks/useAuth';
import { useGoals } from '../hooks/useGoals';

interface ProgressDashboardProps {
  userProfile: UserProfile | null;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ userProfile }) => {
  const { user } = useAuth();
  const { goals, loading: goalsLoading, getGoalStats } = useGoals();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const conversationsData = await getUserConversations(user.id);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goalStats = getGoalStats();
  const totalXP = userProfile?.totalXP || 0;
  const currentLevel = userProfile?.level || 1;
  const dailyStreak = userProfile?.dailyStreak || 0;
  const xpForNextLevel = currentLevel * 1000 - totalXP;

  const getWeeklyProgress = () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const recentConversations = conversations.filter(c => c.updated_at > lastWeek);
    const recentGoals = goals.filter(g => g.createdAt > lastWeek);
    const recentCompletions = goals.filter(g => g.completed && g.completedAt && g.completedAt > lastWeek);
    
    return {
      sessions: recentConversations.length,
      goals: recentGoals.length,
      completed: recentCompletions.length,
      xpGained: recentCompletions.reduce((sum, g) => sum + (g.xpValue || 0), 0)
    };
  };

  const weeklyProgress = getWeeklyProgress();

  const getMotivationTrend = () => {
    const motivationScores = goals.map(g => g.motivation).filter(m => m > 0);
    if (motivationScores.length === 0) return 0;
    return motivationScores.reduce((a, b) => a + b, 0) / motivationScores.length;
  };

  const averageMotivation = getMotivationTrend();

  const getAchievements = () => {
    const achievements = [];
    
    if (goalStats.completed >= 1) {
      achievements.push({ title: "First Steps", icon: "🎯", description: "Completed your first goal" });
    }
    if (goalStats.completed >= 5) {
      achievements.push({ title: "Goal Getter", icon: "⭐", description: "Completed 5 goals" });
    }
    if (goalStats.completed >= 10) {
      achievements.push({ title: "Achiever", icon: "🏆", description: "Completed 10 goals" });
    }
    if (currentLevel >= 5) {
      achievements.push({ title: "Level Up", icon: "🚀", description: "Reached Level 5" });
    }
    if (weeklyProgress.completed >= 3) {
      achievements.push({ title: "Weekly Warrior", icon: "⚡", description: "Completed 3 goals this week" });
    }
    if (dailyStreak >= 7) {
      achievements.push({ title: "Week Streak", icon: "🔥", description: "7-day streak achieved" });
    }
    
    return achievements;
  };

  const achievements = getAchievements();

  if (loading || goalsLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-300">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <div className="relative mx-auto w-16 h-16 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">🏅 Progress Dashboard</h2>
        <p className="text-purple-300">Track your growth and celebrate your achievements</p>
      </div>

      {/* Level & XP Overview */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-2xl p-8 border border-purple-500/20 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Level {currentLevel}</h3>
              <p className="text-purple-300">{totalXP} Total XP</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-purple-300">Next Level</p>
            <p className="text-lg font-bold text-white">{xpForNextLevel} XP to go</p>
          </div>
        </div>
        
        <div className="w-full bg-slate-700 rounded-full h-4 mb-2">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${((totalXP % 1000) / 1000) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-purple-300">
          <span>Level {currentLevel}</span>
          <span>Level {currentLevel + 1}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{conversations.length}</p>
              <p className="text-sm text-purple-300">Total Sessions</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{goalStats.completed}</p>
              <p className="text-sm text-purple-300">Goals Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{dailyStreak}</p>
              <p className="text-sm text-purple-300">Day Streak</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{goalStats.completionRate}%</p>
              <p className="text-sm text-purple-300">Success Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
        <div className="p-6 border-b border-purple-500/20">
          <h3 className="text-xl font-semibold text-white">This Week's Progress</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{weeklyProgress.sessions}</div>
              <div className="text-sm text-purple-300">Coaching Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">{weeklyProgress.goals}</div>
              <div className="text-sm text-purple-300">New Goals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{weeklyProgress.completed}</div>
              <div className="text-sm text-purple-300">Completed Goals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">{weeklyProgress.xpGained}</div>
              <div className="text-sm text-purple-300">XP Gained</div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
          <div className="p-6 border-b border-purple-500/20">
            <div className="flex items-center space-x-2">
              <Award className="w-6 h-6 text-yellow-400" />
              <h3 className="text-xl font-semibold text-white">Achievements</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement, index) => (
                <div key={index} className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <h4 className="font-medium text-white">{achievement.title}</h4>
                      <p className="text-sm text-yellow-300">{achievement.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Goals */}
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
          <div className="p-6 border-b border-purple-500/20">
            <h3 className="text-lg font-semibold text-white">Pending Goals</h3>
          </div>
          
          <div className="p-6">
            {goalStats.pending > 0 ? (
              <div className="space-y-3">
                {goals.filter(g => !g.completed).slice(0, 5).map((goal) => (
                  <div key={goal.id} className="flex items-start space-x-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{goal.description}</p>
                      {goal.deadline && (
                        <p className="text-xs text-purple-300 mt-1">
                          Due: {goal.deadline.toLocaleDateString()}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="flex items-center space-x-1 text-xs text-purple-300">
                          <Star className="w-3 h-3" />
                          <span>{goal.xpValue || 50} XP</span>
                        </div>
                        <span className="text-xs text-yellow-400">
                          Motivation: {goal.motivation}/10
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {goalStats.pending > 5 && (
                  <div className="text-center text-sm text-purple-400">
                    And {goalStats.pending - 5} more pending goals...
                  </div>
                )}
              </div>
            ) : (
              <p className="text-purple-300 text-center py-4">No pending goals</p>
            )}
          </div>
        </div>

        {/* Recent Completions */}
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
          <div className="p-6 border-b border-purple-500/20">
            <h3 className="text-lg font-semibold text-white">Recent Completions</h3>
          </div>
          
          <div className="p-6">
            {goalStats.completed > 0 ? (
              <div className="space-y-3">
                {goals.filter(g => g.completed).slice(0, 5).map((goal) => (
                  <div key={goal.id} className="flex items-start space-x-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white line-through opacity-75">{goal.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1 text-xs text-green-400">
                          <Zap className="w-3 h-3" />
                          <span>+{goal.xpValue || 50} XP</span>
                        </div>
                        <p className="text-xs text-green-400">
                          {goal.completedAt?.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {goalStats.completed > 5 && (
                  <div className="text-center text-sm text-purple-400">
                    And {goalStats.completed - 5} more completed goals...
                  </div>
                )}
              </div>
            ) : (
              <p className="text-purple-300 text-center py-4">No completed goals yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {goalStats.overdue > 0 && (
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Target className="w-5 h-5 text-red-400" />
            <h3 className="font-semibold text-red-300">Overdue Goals</h3>
          </div>
          <p className="text-red-200 text-sm mb-3">
            You have {goalStats.overdue} overdue goal{goalStats.overdue > 1 ? 's' : ''}. Consider revisiting these in your next coaching session.
          </p>
          <div className="space-y-2">
            {goals.filter(g => !g.completed && g.deadline && g.deadline < new Date()).map((goal) => (
              <div key={goal.id} className="text-sm text-red-300 bg-red-500/10 p-2 rounded">
                • {goal.description} (Due: {goal.deadline?.toLocaleDateString()})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goal Statistics Summary */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
        <div className="p-6 border-b border-purple-500/20">
          <h3 className="text-xl font-semibold text-white">Goal Statistics</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">{goalStats.total}</div>
              <div className="text-sm text-purple-300">Total Goals Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{goalStats.totalXPEarned}</div>
              <div className="text-sm text-purple-300">Total XP Earned</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{averageMotivation.toFixed(1)}</div>
              <div className="text-sm text-purple-300">Avg Motivation</div>
            </div>
          </div>
          
          {goalStats.total > 0 && (
            <div className="mt-6">
              <div className="text-sm text-purple-300 mb-2">Overall Progress</div>
              <div className="w-full bg-slate-700 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${goalStats.completionRate}%` }}
                />
              </div>
              <div className="text-center text-sm text-purple-300 mt-2">
                {goalStats.completed} of {goalStats.total} goals completed ({goalStats.completionRate}%)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
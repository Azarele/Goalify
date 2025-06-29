import React, { useState, useEffect } from 'react';
import { MessageCircle, Plus, Calendar, Clock, ArrowRight, Sparkles, Target, Mic } from 'lucide-react';
import { getUserConversations } from '../services/database';
import { UserProfile } from '../types/coaching';
import { useAuth } from '../hooks/useAuth';
import { useGoals } from '../hooks/useGoals';

interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  completed: boolean;
}

interface StartPageProps {
  userProfile: UserProfile | null;
  onStartNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export const StartPage: React.FC<StartPageProps> = ({
  userProfile,
  onStartNewConversation,
  onSelectConversation
}) => {
  const { user } = useAuth();
  const { goals, getGoalStats } = useGoals();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const conversationsData = await getUserConversations(user.id);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    onSelectConversation(conversation.id);
  };

  const getRecentConversations = () => {
    return conversations.slice(0, 6); // Show up to 6 recent conversations
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    return date.toLocaleDateString();
  };

  const recentConversations = getRecentConversations();
  const goalStats = getGoalStats();

  return (
    <div className="flex-1 scrollable-container bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-6">
          {/* Logo */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white">
              {userProfile?.name ? `Welcome back, ${userProfile.name}!` : 'Welcome to Goalify'}
            </h1>
            <p className="text-purple-300 text-lg max-w-2xl mx-auto">
              Your AI coaching companion for meaningful conversations and personal growth. 
              {goalStats.total > 0 ? ` You have ${goalStats.pending} active goals and ${goalStats.completed} completed. ` : ' '}
              Ready to continue your journey or start something new?
            </p>
          </div>

          {/* User Stats */}
          {userProfile && (
            <div className="flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-2 rounded-full border border-purple-500/30">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300">Level {userProfile.level || 1}</span>
                <span className="text-purple-200 text-xs">({userProfile.totalXP || 0} XP)</span>
              </div>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-4 py-2 rounded-full border border-orange-500/30">
                <span className="text-orange-300">{userProfile.dailyStreak || 0} day streak</span>
              </div>
              <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-4 py-2 rounded-full border border-blue-500/30">
                <span className="text-blue-300">{goalStats.completed}/{goalStats.total} goals completed</span>
              </div>
            </div>
          )}
        </div>

        {/* Goal Progress Summary */}
        {goalStats.total > 0 && (
          <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Your Goal Progress</h3>
              <span className="text-purple-300 text-sm">{goalStats.completionRate}% completion rate</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{goalStats.pending}</div>
                <div className="text-sm text-yellow-300">Active Goals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">{goalStats.completed}</div>
                <div className="text-sm text-green-300">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">{goalStats.totalXPEarned}</div>
                <div className="text-sm text-purple-300">XP Earned</div>
              </div>
            </div>
            
            {goalStats.total > 0 && (
              <div className="mt-4">
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${goalStats.completionRate}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Action Section */}
        <div className="space-y-8">
          {/* Start New Conversation Button */}
          <div className="text-center">
            <button
              onClick={onStartNewConversation}
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-purple-500/25"
            >
              <div className="flex items-center space-x-3">
                <Plus className="w-6 h-6" />
                <span>Start New Conversation</span>
              </div>
            </button>

            {/* Quick Tips */}
            <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-purple-400">
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span>Type</span>
              </div>
              <span>or</span>
              <div className="flex items-center space-x-1">
                <Mic className="w-4 h-4" />
                <span>Speak</span>
              </div>
            </div>
          </div>

          {/* Recent Conversations Section */}
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-purple-300">Loading your conversations...</p>
            </div>
          ) : recentConversations.length > 0 ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-white mb-2">Recent Conversations</h2>
                <p className="text-purple-300">Pick up where you left off</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation)}
                    className="group p-6 bg-gradient-to-br from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 backdrop-blur-sm text-left"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          conversation.completed 
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {conversation.completed ? 'Complete' : 'In Progress'}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-1" />
                    </div>

                    <h3 className="text-white font-medium mb-2 line-clamp-2 group-hover:text-purple-200 transition-colors">
                      {conversation.title}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-purple-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(conversation.updated_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{conversation.created_at.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {conversations.length > 6 && (
                <div className="text-center">
                  <p className="text-purple-400 text-sm">
                    And {conversations.length - 6} more conversations in your history
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
                  <MessageCircle className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Ready for your first conversation?</h3>
              <p className="text-purple-300 mb-6">
                Start your coaching journey and discover new insights about yourself.
              </p>
            </div>
          )}
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-3">
              <MessageCircle className="w-6 h-6 text-purple-400" />
              <span className="text-white font-semibold">Natural Conversation</span>
            </div>
            <p className="text-purple-300 text-sm">
              Share what's on your mind through voice or text. I'll listen and ask thoughtful questions to help you think deeper.
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-3">
              <Target className="w-6 h-6 text-blue-400" />
              <span className="text-white font-semibold">Goal-Focused Guidance</span>
            </div>
            <p className="text-purple-300 text-sm">
              Together we'll explore your goals, current reality, options, and create actionable next steps that you can track and complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
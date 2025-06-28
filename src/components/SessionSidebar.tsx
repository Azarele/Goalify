import React, { useState, useEffect } from 'react';
import { X, Calendar, MessageCircle, Clock, Search, Filter } from 'lucide-react';
import { CoachingSession, UserProfile } from '../types/coaching';
import { getUserSessions } from '../services/database';
import { useAuth } from '../hooks/useAuth';

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: CoachingSession | null;
  userProfile: UserProfile | null;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  isOpen,
  onClose,
  currentSession,
  userProfile
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [allSessions, setAllSessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    if (!user) {
      setAllSessions([]);
      setLoading(false);
      return;
    }

    try {
      const sessions = await getUserSessions(user.id);
      setAllSessions(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getSessionsByPeriod = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    let filteredSessions = allSessions;

    // Apply search filter
    if (searchTerm) {
      filteredSessions = filteredSessions.filter(session => {
        const content = session.messages?.map(m => m.content).join(' ').toLowerCase() || '';
        return content.includes(searchTerm.toLowerCase());
      });
    }

    // Apply period filter
    if (filterPeriod !== 'all') {
      switch (filterPeriod) {
        case 'today':
          filteredSessions = filteredSessions.filter(s => s.date >= today);
          break;
        case 'week':
          filteredSessions = filteredSessions.filter(s => s.date >= weekAgo);
          break;
        case 'month':
          filteredSessions = filteredSessions.filter(s => s.date >= monthAgo);
          break;
      }
    }

    return {
      today: filteredSessions.filter(s => s.date >= today),
      thisWeek: filteredSessions.filter(s => s.date >= weekAgo && s.date < today),
      thisMonth: filteredSessions.filter(s => s.date >= monthAgo && s.date < weekAgo),
      older: filteredSessions.filter(s => s.date < monthAgo)
    };
  };

  const sessionGroups = getSessionsByPeriod();

  const getSessionPreview = (session: CoachingSession) => {
    const userMessages = session.messages?.filter(m => m.role === 'user') || [];
    const firstMessage = userMessages[0];
    return firstMessage?.content.substring(0, 80) + '...' || 'No messages';
  };

  const getSessionTopic = (session: CoachingSession) => {
    const userMessages = session.messages?.filter(m => m.role === 'user') || [];
    const firstMessage = userMessages[0];
    if (!firstMessage) return 'New Session';
    
    const content = firstMessage.content.toLowerCase();
    if (content.includes('career')) return 'Career Development';
    if (content.includes('relationship')) return 'Relationships';
    if (content.includes('health') || content.includes('fitness')) return 'Health & Wellness';
    if (content.includes('time') || content.includes('productivity')) return 'Time Management';
    if (content.includes('confidence') || content.includes('self')) return 'Self-Development';
    if (content.includes('stress') || content.includes('anxiety')) return 'Stress Management';
    if (content.includes('goal') || content.includes('achieve')) return 'Goal Setting';
    
    return 'Personal Growth';
  };

  const SessionGroup = ({ title, sessions, icon }: { title: string; sessions: CoachingSession[]; icon: React.ReactNode }) => {
    if (sessions.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          {icon}
          <h4 className="font-medium text-purple-200 text-sm">{title}</h4>
          <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
            {sessions.length}
          </span>
        </div>
        
        <div className="space-y-2">
          {sessions.map((session) => (
            <div 
              key={session.id}
              className={`p-3 rounded-lg transition-all duration-300 cursor-pointer border ${
                currentSession?.id === session.id
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30'
                  : 'bg-slate-700/30 hover:bg-slate-600/40 border-slate-600/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">
                  {getSessionTopic(session)}
                </span>
                <span className="text-xs text-purple-300">
                  {session.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-xs text-purple-400 mb-2">
                {session.date.toLocaleDateString()}
              </div>
              <p className="text-xs text-gray-300 line-clamp-2 mb-2">
                {getSessionPreview(session)}
              </p>
              <div className="flex items-center justify-between text-xs text-purple-400">
                <span>{session.messages?.length || 0} messages</span>
                <span className={`px-2 py-1 rounded-full ${
                  session.completed 
                    ? 'bg-green-500/20 text-green-300' 
                    : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {session.completed ? 'Complete' : 'In Progress'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative top-0 left-0 h-full w-80 bg-gradient-to-b from-slate-800 to-purple-900 border-r border-purple-500/20 z-50
        transform transition-transform duration-300 ease-in-out backdrop-blur-sm
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isOpen ? 'lg:block' : 'lg:hidden'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">📜 Conversation History</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2 mb-3">
              <Filter className="w-4 h-4 text-purple-400" />
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="flex-1 py-2 px-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div className="text-sm text-purple-300">
              {allSessions.length} total sessions
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-purple-300">Loading sessions...</p>
              </div>
            ) : allSessions.length > 0 ? (
              <>
                <SessionGroup 
                  title="Today's Sessions" 
                  sessions={sessionGroups.today}
                  icon={<Clock className="w-4 h-4 text-green-400" />}
                />
                <SessionGroup 
                  title="Past Week" 
                  sessions={sessionGroups.thisWeek}
                  icon={<Calendar className="w-4 h-4 text-blue-400" />}
                />
                <SessionGroup 
                  title="Past Month" 
                  sessions={sessionGroups.thisMonth}
                  icon={<Calendar className="w-4 h-4 text-purple-400" />}
                />
                <SessionGroup 
                  title="Older" 
                  sessions={sessionGroups.older}
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-white mb-2">No conversations yet</h3>
                <p className="text-purple-300 text-sm">
                  Start your first coaching session to see your history here!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
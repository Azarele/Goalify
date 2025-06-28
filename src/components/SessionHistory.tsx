import React from 'react';
import { Calendar, MessageCircle, Target, TrendingUp, Clock } from 'lucide-react';
import { getSessions } from '../utils/storage';

export const SessionHistory: React.FC = () => {
  const sessions = getSessions();
  
  const getSessionsByPeriod = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      today: sessions.filter(s => s.date >= today),
      thisWeek: sessions.filter(s => s.date >= weekAgo && s.date < today),
      thisMonth: sessions.filter(s => s.date >= monthAgo && s.date < weekAgo),
      older: sessions.filter(s => s.date < monthAgo)
    };
  };

  const sessionGroups = getSessionsByPeriod();

  const getSessionSummary = (session: any) => {
    const userMessages = session.messages?.filter((m: any) => m.role === 'user') || [];
    const lastUserMessage = userMessages[userMessages.length - 1];
    return lastUserMessage?.content.substring(0, 100) + '...' || 'No messages';
  };

  const getSessionInsights = (session: any) => {
    const messages = session.messages || [];
    const totalMessages = messages.length;
    const userMessages = messages.filter((m: any) => m.role === 'user').length;
    
    return {
      totalMessages,
      userMessages,
      duration: Math.round(totalMessages * 1.5) // Estimate duration
    };
  };

  const SessionGroup = ({ title, sessions, icon }: { title: string; sessions: any[]; icon: React.ReactNode }) => {
    if (sessions.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          {icon}
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <span className="text-sm bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
            {sessions.length} session{sessions.length > 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="grid gap-4">
          {sessions.map((session) => {
            const insights = getSessionInsights(session);
            return (
              <div key={session.id} className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 backdrop-blur-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg font-medium text-white">
                        {session.date.toLocaleDateString()}
                      </span>
                      <span className="text-sm text-purple-300">
                        {session.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-3">
                      {getSessionSummary(session)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                      session.completed 
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    }`}>
                      {session.completed ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-6 text-purple-300">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-4 h-4" />
                      <span>{insights.totalMessages} messages</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>~{insights.duration} min</span>
                    </div>
                  </div>
                  
                  {session.goals?.length > 0 && (
                    <div className="flex items-center space-x-2 text-purple-300">
                      <Target className="w-4 h-4" />
                      <span>{session.goals.length} goals</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <div className="relative mx-auto w-16 h-16 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Session History</h2>
        <p className="text-purple-300">Review your coaching journey and insights</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{sessions.length}</p>
              <p className="text-sm text-purple-300">Total Sessions</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {sessions.reduce((acc, s) => acc + (s.actions?.length || 0), 0)}
              </p>
              <p className="text-sm text-purple-300">Actions Identified</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + (s.messages?.length || 0), 0) / sessions.length) : 0}
              </p>
              <p className="text-sm text-purple-300">Avg Messages/Session</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session Groups */}
      {sessions.length > 0 ? (
        <>
          <SessionGroup 
            title="Today's Sessions" 
            sessions={sessionGroups.today}
            icon={<Clock className="w-6 h-6 text-green-400" />}
          />
          <SessionGroup 
            title="Past Week" 
            sessions={sessionGroups.thisWeek}
            icon={<Calendar className="w-6 h-6 text-blue-400" />}
          />
          <SessionGroup 
            title="Past Month" 
            sessions={sessionGroups.thisMonth}
            icon={<Calendar className="w-6 h-6 text-purple-400" />}
          />
          <SessionGroup 
            title="Older Sessions" 
            sessions={sessionGroups.older}
            icon={<Calendar className="w-6 h-6 text-gray-400" />}
          />
        </>
      ) : (
        <div className="text-center py-16">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
              <Calendar className="w-10 h-10 text-purple-400" />
            </div>
          </div>
          <h3 className="text-2xl font-medium text-white mb-3">No sessions yet</h3>
          <p className="text-purple-300 mb-6">Start your first coaching conversation to see your history here!</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
          >
            Start Your First Session
          </button>
        </div>
      )}
    </div>
  );
};
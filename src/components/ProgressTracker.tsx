import React from 'react';
import { BarChart3, TrendingUp, Calendar, Target, Award } from 'lucide-react';
import { getSessions, getCompletedActions, getAverageMotivation } from '../utils/sessionStorage';

export const ProgressTracker: React.FC = () => {
  const sessions = getSessions();
  const completedActions = getCompletedActions();
  const averageMotivation = getAverageMotivation();
  
  const recentSessions = sessions.slice(-5).reverse();

  const getMotivationTrend = () => {
    const lastFive = sessions.slice(-5).map(s => s.whatNext.motivation);
    if (lastFive.length < 2) return 'neutral';
    
    const recent = lastFive.slice(-2);
    return recent[1] > recent[0] ? 'up' : recent[1] < recent[0] ? 'down' : 'neutral';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Coaching Progress</h2>
        <p className="text-gray-600">Track your journey and celebrate your growth</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              <p className="text-sm text-gray-600">Total Sessions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completedActions}</p>
              <p className="text-sm text-gray-600">Actions Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{averageMotivation.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Avg Motivation</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.length > 0 ? Math.round((completedActions / sessions.length) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-600">Success Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
        </div>
        <div className="p-6">
          {recentSessions.length > 0 ? (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{session.topic}</h4>
                    <span className="text-sm text-gray-500">
                      {session.date.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{session.goal}</p>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      session.completed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {session.completed ? 'Completed' : 'In Progress'}
                    </span>
                    <span className="text-sm text-gray-500">
                      Motivation: {session.whatNext.motivation}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
              <p className="text-gray-600">Start your first coaching session to see your progress here!</p>
            </div>
          )}
        </div>
      </div>

      {/* Motivation Trend */}
      {sessions.length > 1 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Motivation Trend</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${
                getMotivationTrend() === 'up' ? 'text-green-600' : 
                getMotivationTrend() === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                <TrendingUp className={`w-5 h-5 ${
                  getMotivationTrend() === 'down' ? 'transform rotate-180' : ''
                }`} />
                <span className="font-medium">
                  {getMotivationTrend() === 'up' ? 'Increasing' : 
                   getMotivationTrend() === 'down' ? 'Decreasing' : 'Stable'}
                </span>
              </div>
              <span className="text-gray-600">
                Recent average: {averageMotivation.toFixed(1)}/10
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
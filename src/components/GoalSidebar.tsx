import React, { useState, useEffect } from 'react';
import { X, Target, TrendingUp, CheckCircle, Calendar, Star, Zap, Trophy, Award } from 'lucide-react';
import { CoachingSession, ConversationContext, UserProfile } from '../types/coaching';
import { getSessionGoals, saveGoal, updateUserProfile } from '../services/database';
import { verifyGoalCompletion } from '../services/openai';
import { GoalCompletionModal } from './GoalCompletionModal';
import { useAuth } from '../hooks/useAuth';

interface GoalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: CoachingSession | null;
  context: ConversationContext;
  userProfile: UserProfile | null;
}

interface Goal {
  id: string;
  description: string;
  xpValue: number;
  difficulty: 'easy' | 'medium' | 'hard';
  motivation: number;
  completed: boolean;
  completedAt?: Date;
  completionReasoning?: string;
  deadline?: Date;
  createdAt: Date;
}

export const GoalSidebar: React.FC<GoalSidebarProps> = ({
  isOpen,
  onClose,
  currentSession,
  context,
  userProfile
}) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => {
    loadGoals();
    loadUserProgress();
  }, [currentSession, userProfile]);

  const loadGoals = async () => {
    if (!currentSession || !user) {
      setGoals([]);
      return;
    }

    try {
      const sessionGoals = await getSessionGoals(user.id, currentSession.id);
      setGoals(sessionGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const loadUserProgress = () => {
    if (!userProfile) return;
    setUserXP(userProfile.totalXP || 0);
    setUserLevel(calculateLevel(userProfile.totalXP || 0));
  };

  const calculateLevel = (xp: number): number => {
    return Math.floor(xp / 1000) + 1;
  };

  const getXPForNextLevel = (): number => {
    return userLevel * 1000 - userXP;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'hard': return 'text-red-400 bg-red-500/20';
      default: return 'text-purple-400 bg-purple-500/20';
    }
  };

  const getStageProgress = () => {
    const stages = ['exploring', 'goal', 'reality', 'options', 'action'];
    const currentIndex = stages.indexOf(context.growStage);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  const handleGoalClick = (goal: Goal) => {
    if (!goal.completed) {
      setSelectedGoal(goal);
      setShowCompletionModal(true);
    }
  };

  const handleVerifyGoal = async (goalId: string, reasoning: string): Promise<{ verified: boolean; feedback: string }> => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return { verified: false, feedback: 'Goal not found.' };

    try {
      const result = await verifyGoalCompletion(goal.description, reasoning);
      return result;
    } catch (error) {
      console.error('Verification error:', error);
      return { verified: false, feedback: 'Verification failed. Please try again.' };
    }
  };

  const handleCompleteGoal = async (goalId: string, xpReward: number) => {
    if (!user || !userProfile) return;

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    try {
      // Update goal as completed
      const updatedGoal = { 
        ...goal, 
        completed: true,
        completedAt: new Date()
      };

      await saveGoal(user.id, currentSession?.id || '', updatedGoal);

      // Award XP and update user profile
      const newXP = userXP + xpReward;
      const newLevel = calculateLevel(newXP);
      
      await updateUserProfile(user.id, {
        ...userProfile,
        totalXP: newXP,
        level: newLevel
      });

      setUserXP(newXP);
      setUserLevel(newLevel);
      setXpGained(xpReward);
      setShowXPAnimation(true);

      setTimeout(() => setShowXPAnimation(false), 3000);

      loadGoals();
    } catch (error) {
      console.error('Error completing goal:', error);
    }
  };

  const pendingGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);
  const completionRate = goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* XP Animation */}
      {showXPAnimation && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-60 pointer-events-none">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5" />
              <span className="font-bold">+{xpGained} XP!</span>
            </div>
          </div>
        </div>
      )}

      {/* Goal Completion Modal */}
      {selectedGoal && (
        <GoalCompletionModal
          goal={selectedGoal}
          isOpen={showCompletionModal}
          onClose={() => {
            setShowCompletionModal(false);
            setSelectedGoal(null);
          }}
          onVerify={handleVerifyGoal}
          onComplete={handleCompleteGoal}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative top-0 right-0 h-full w-80 bg-gradient-to-b from-slate-800 to-purple-900 border-l border-purple-500/20 z-50
        transform transition-transform duration-300 ease-in-out backdrop-blur-sm
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        ${isOpen ? 'lg:block' : 'lg:hidden'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">🎯 Goals & Challenges</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>

            {/* User Level & XP */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-medium">Level {userLevel}</span>
                </div>
                <span className="text-purple-300 text-sm">{userXP} XP</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((userXP % 1000) / 1000) * 100}%` }}
                />
              </div>
              <div className="text-xs text-purple-300 text-center">
                {getXPForNextLevel()} XP to Level {userLevel + 1}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple-200">GROW Progress</span>
                <span className="font-medium text-purple-400">{Math.round(getStageProgress())}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getStageProgress()}%` }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Session Info */}
            {currentSession && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-3 border border-blue-500/20">
                <div className="text-center">
                  <div className="text-sm text-blue-300 mb-1">Current Session Goals</div>
                  <div className="text-lg font-bold text-white">{goals.length}</div>
                </div>
              </div>
            )}

            {/* Stats */}
            {goals.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-3 border border-yellow-500/20">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{pendingGoals.length}</div>
                    <div className="text-xs text-yellow-300">Pending</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg p-3 border border-green-500/20">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{completionRate}%</div>
                    <div className="text-xs text-green-300">Complete</div>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Goals */}
            {pendingGoals.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-white flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                  <span>In Progress</span>
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                    {pendingGoals.length}
                  </span>
                </h4>
                
                <div className="space-y-2">
                  {pendingGoals.map((goal) => (
                    <div 
                      key={goal.id}
                      onClick={() => handleGoalClick(goal)}
                      className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-600/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-1 w-5 h-5 border-2 border-purple-400 rounded hover:bg-purple-400 transition-colors flex items-center justify-center group-hover:border-purple-300">
                          {goal.completed && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white group-hover:text-purple-200 transition-colors">{goal.description}</p>
                          
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(goal.difficulty)}`}>
                              {goal.difficulty}
                            </span>
                            <div className="flex items-center space-x-1 text-xs text-purple-300">
                              <Star className="w-3 h-3" />
                              <span>{goal.xpValue} XP</span>
                            </div>
                          </div>

                          {goal.deadline && (
                            <p className="text-xs text-purple-300 mt-1 flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>Due: {goal.deadline.toLocaleDateString()}</span>
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-purple-400">
                              Motivation: {goal.motivation}/10
                            </span>
                            <span className="text-xs text-gray-400">
                              {goal.createdAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-300 text-xs">
                    💡 Click on a challenge to mark it complete and earn XP!
                  </p>
                </div>
              </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-white flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Completed</span>
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                    {completedGoals.length}
                  </span>
                </h4>
                
                <div className="space-y-2">
                  {completedGoals.map((goal) => (
                    <div 
                      key={goal.id}
                      className="p-3 bg-green-500/10 rounded-lg border border-green-500/20"
                    >
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                        <div className="flex-1">
                          <p className="text-sm text-white line-through opacity-75">{goal.description}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-green-400">
                                +{goal.xpValue} XP earned
                              </span>
                              <Award className="w-3 h-3 text-yellow-400" />
                            </div>
                            <span className="text-xs text-green-400">
                              {goal.completedAt?.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {goals.length === 0 && (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-white mb-2">No challenges yet</h3>
                <p className="text-purple-300 text-sm mb-4">
                  Continue your conversation to identify challenges and track your progress!
                </p>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                  <p className="text-purple-300 text-xs">
                    🤖 I'll automatically suggest challenges based on our conversation
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
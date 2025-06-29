import { useState, useEffect } from 'react';
import { Goal } from '../types/coaching';
import { getAllUserGoals, saveGoal, updateUserProfile } from '../services/database';
import { useAuth } from './useAuth';

export const useGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadGoals();
    } else {
      setGoals([]);
      setLoading(false);
    }
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userGoals = await getAllUserGoals(user.id);
      setGoals(userGoals);
      console.log('✅ Goals loaded in useGoals hook:', userGoals.length, 'goals');
      
      // Log goal details for debugging
      if (userGoals.length > 0) {
        console.log('📊 Goal breakdown:', {
          total: userGoals.length,
          completed: userGoals.filter(g => g.completed).length,
          pending: userGoals.filter(g => !g.completed).length,
          recent: userGoals.slice(0, 3).map(g => ({ 
            id: g.id.substring(0, 8), 
            description: g.description.substring(0, 30) + '...', 
            completed: g.completed 
          }))
        });
      }
    } catch (error) {
      console.error('❌ Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async (goal: Goal, sessionId: string) => {
    if (!user) return;

    try {
      await saveGoal(user.id, sessionId, goal);
      setGoals(prev => [goal, ...prev]);
      console.log('✅ Goal added to global state:', goal.description);
    } catch (error) {
      console.error('❌ Error adding goal:', error);
    }
  };

  const completeGoal = async (goalId: string, reasoning: string, xpGained: number, userProfile: any) => {
    if (!user) return;

    try {
      const updatedGoal = goals.find(g => g.id === goalId);
      if (!updatedGoal) return;

      const completedGoal = {
        ...updatedGoal,
        completed: true,
        completedAt: new Date(),
        completionReasoning: reasoning
      };

      // Update goal in database
      await saveGoal(user.id, '', completedGoal);

      // Update user profile with XP
      const newXP = (userProfile?.totalXP || 0) + xpGained;
      const newLevel = Math.floor(newXP / 1000) + 1;

      await updateUserProfile(user.id, {
        ...userProfile,
        totalXP: newXP,
        level: newLevel
      });

      // Update local state
      setGoals(prev => prev.map(g => 
        g.id === goalId ? completedGoal : g
      ));

      console.log('✅ Goal completed with XP reward:', xpGained);
      return { newXP, newLevel };
    } catch (error) {
      console.error('❌ Error completing goal:', error);
      return null;
    }
  };

  const getGoalStats = () => {
    const completed = goals.filter(g => g.completed);
    const pending = goals.filter(g => !g.completed);
    const overdue = goals.filter(g => !g.completed && g.deadline && g.deadline < new Date());
    
    const completionRate = goals.length > 0 ? Math.round((completed.length / goals.length) * 100) : 0;
    
    const totalXPEarned = completed.reduce((sum, goal) => sum + (goal.xpValue || 0), 0);
    
    const goalsByDifficulty = {
      easy: goals.filter(g => g.difficulty === 'easy').length,
      medium: goals.filter(g => g.difficulty === 'medium').length,
      hard: goals.filter(g => g.difficulty === 'hard').length,
    };

    const completionByDifficulty = {
      easy: completed.filter(g => g.difficulty === 'easy').length,
      medium: completed.filter(g => g.difficulty === 'medium').length,
      hard: completed.filter(g => g.difficulty === 'hard').length,
    };

    return {
      total: goals.length,
      completed: completed.length,
      pending: pending.length,
      overdue: overdue.length,
      completionRate,
      totalXPEarned,
      goalsByDifficulty,
      completionByDifficulty,
      recentGoals: goals.slice(0, 10)
    };
  };

  // CRITICAL: Force refresh goals from database
  const refreshGoals = async () => {
    console.log('🔄 Forcing goal refresh...');
    await loadGoals();
  };

  return {
    goals,
    loading,
    addGoal,
    completeGoal,
    loadGoals,
    refreshGoals,
    getGoalStats
  };
};
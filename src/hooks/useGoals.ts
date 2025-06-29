import { useState, useEffect } from 'react';
import { Goal } from '../types/coaching';
import { getUserGoals, saveGoal, completeGoal, initializeUserStats } from '../services/database';
import { useAuth } from './useAuth';

export const useGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadGoals();
      // Initialize user stats if this is a new user
      initializeUserStats(user.id);
    } else {
      setGoals([]);
      setLoading(false);
    }
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔄 Loading goals from database for user:', user.id);
      const userGoals = await getUserGoals(user.id);
      setGoals(userGoals);
      console.log('✅ Goals loaded in useGoals hook:', userGoals.length, 'goals');
    } catch (error) {
      console.error('❌ Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async (goal: Goal, sessionId: string) => {
    if (!user) return;

    try {
      // Add to local state immediately for instant UI update
      setGoals(prev => [goal, ...prev]);
      console.log('✅ Goal added to local state immediately:', goal.description);
      
      // Save to database/storage in background
      await saveGoal(user.id, sessionId, goal);
      console.log('✅ Goal persisted to storage:', goal.description);
      
      // Reload goals to ensure we have the latest data from database
      setTimeout(() => {
        loadGoals();
      }, 500);
    } catch (error) {
      console.error('❌ Error adding goal:', error);
      // Goal is still in local state even if save failed
    }
  };

  const completeGoalAction = async (goalId: string, reasoning: string, xpGained: number, userProfile: any) => {
    if (!user) return;

    try {
      const updatedGoal = goals.find(g => g.id === goalId);
      if (!updatedGoal) return;

      const completedGoal = {
        ...updatedGoal,
        completed: true,
        completedAt: new Date(),
        completionReasoning: reasoning,
        xpValue: xpGained // Update XP value with any bonuses
      };

      // Update local state immediately
      setGoals(prev => prev.map(g => 
        g.id === goalId ? completedGoal : g
      ));

      // Complete goal in database
      const result = await completeGoal(user.id, goalId, reasoning, xpGained);
      
      if (result) {
        console.log('✅ Goal completed with XP reward:', xpGained, 'New total XP:', result.newXP);
        
        // Reload goals to ensure consistency with database
        setTimeout(() => {
          loadGoals();
        }, 500);
        
        return result;
      } else {
        console.error('❌ Goal completion failed in database');
        return null;
      }
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

  return {
    goals,
    loading,
    addGoal,
    completeGoal: completeGoalAction,
    loadGoals,
    getGoalStats
  };
};
import { useState, useEffect } from 'react';
import { Goal } from '../types/coaching';
import { getUserGoals, saveGoal, completeGoal, initializeUserStats, syncPendingData } from '../services/database';
import { useAuth } from './useAuth';

export const useGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // ENHANCED: Set up real-time cross-device sync
  useEffect(() => {
    if (user) {
      // Initial load
      loadGoals();
      
      // Initialize user stats if this is a new user
      initializeUserStats(user.id);
      
      // Set up periodic sync for cross-device consistency
      const syncInterval = setInterval(() => {
        if (user) {
          console.log('🔄 Performing periodic cross-device sync check');
          syncPendingData(user.id);
          loadGoals();
        }
      }, 30000); // Check every 30 seconds
      
      // Clean up interval on unmount
      return () => clearInterval(syncInterval);
    } else {
      setGoals([]);
      setLoading(false);
    }
  }, [user]);

  // ENHANCED: Add network status monitoring for offline/online sync
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network connection restored - syncing data');
      if (user) {
        syncPendingData(user.id);
        loadGoals();
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔄 Loading goals from database with real-time cross-device sync for user:', user.id);
      const userGoals = await getUserGoals(user.id);
      setGoals(userGoals);
      console.log('✅ Goals loaded with real-time cross-device sync:', userGoals.length, 'goals');
    } catch (error) {
      console.error('❌ Error loading goals with real-time cross-device sync:', error);
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async (goal: Goal, sessionId: string) => {
    if (!user) return;

    try {
      // ENHANCED: Add to local state immediately for instant UI update and real-time cross-device sync
      setGoals(prev => [goal, ...prev]);
      console.log('✅ Goal added to local state immediately with real-time cross-device sync:', goal.description);
      
      // ENHANCED: Save to database/storage in background with real-time cross-device sync
      await saveGoal(user.id, sessionId, goal);
      console.log('✅ Goal persisted to storage with real-time cross-device sync:', goal.description);
      
      // ENHANCED: Reload goals to ensure we have the latest data from database for real-time cross-device sync
      setTimeout(() => {
        loadGoals();
      }, 500);
    } catch (error) {
      console.error('❌ Error adding goal with real-time cross-device sync:', error);
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

      // ENHANCED: Update local state immediately for real-time cross-device sync
      setGoals(prev => prev.map(g => 
        g.id === goalId ? completedGoal : g
      ));

      // ENHANCED: Complete goal in database with real-time cross-device sync
      const result = await completeGoal(user.id, goalId, reasoning, xpGained);
      
      if (result) {
        console.log('✅ Goal completed with XP reward and real-time cross-device sync:', xpGained, 'New total XP:', result.newXP);
        
        // ENHANCED: Reload goals to ensure consistency with database for real-time cross-device sync
        setTimeout(() => {
          loadGoals();
        }, 500);
        
        return result;
      } else {
        console.error('❌ Goal completion failed in database');
        return null;
      }
    } catch (error) {
      console.error('❌ Error completing goal with real-time cross-device sync:', error);
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

  // ENHANCED: Force sync method for manual triggering
  const forceSync = async () => {
    if (!user) return;
    
    console.log('🔄 Forcing manual cross-device sync');
    await syncPendingData(user.id);
    await loadGoals();
    console.log('✅ Manual cross-device sync completed');
  };

  return {
    goals,
    loading,
    addGoal,
    completeGoal: completeGoalAction,
    loadGoals,
    getGoalStats,
    forceSync // New method for manual sync
  };
};
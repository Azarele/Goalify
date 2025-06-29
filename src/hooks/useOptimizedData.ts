import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { db } from '../services/optimizedDatabase';
import { Goal, UserProfile } from '../types/coaching';

// Consolidated data hook to reduce redundancy
export const useOptimizedData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<{
    profile: UserProfile | null;
    goals: Goal[];
    conversations: any[];
    loading: boolean;
  }>({
    profile: null,
    goals: [],
    conversations: [],
    loading: true
  });

  const loadData = useCallback(async () => {
    if (!user) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const userData = await db.getUserData(user.id);
      setData({
        ...userData,
        loading: false
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(() => {
    if (user) {
      db.clearCache(`user_data_${user.id}`);
      loadData();
    }
  }, [user, loadData]);

  return {
    ...data,
    refreshData
  };
};
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MessageCircle, BarChart3, Settings as SettingsIcon, LogOut, Flame, Brain } from 'lucide-react';
import { ConversationalCoach } from './components/ConversationalCoach';
import { ProgressDashboard } from './components/ProgressDashboard';
import { UserAnalysis } from './components/UserAnalysis';
import { Settings } from './components/Settings';
import { AuthScreen } from './components/AuthScreen';
import { AuthCallback } from './components/AuthCallback';
import { OnboardingModal } from './components/OnboardingModal';
import { useAuth } from './hooks/useAuth';
import { useGoals } from './hooks/useGoals';
import { getUserProfile, createUserProfile } from './services/database';
import { UserProfile } from './types/coaching';

type AppView = 'coaching' | 'progress' | 'analysis' | 'settings';

function MainApp() {
  const { user, loading, signOut } = useAuth();
  const { goals, loadGoals } = useGoals();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<AppView>('coaching');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setUserProfile(null);
      setProfileLoading(false);
    }
  }, [user]);

  // Reload goals when user profile changes (for XP updates)
  useEffect(() => {
    if (user && userProfile) {
      loadGoals();
    }
  }, [user, userProfile?.totalXP]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      let profile = await getUserProfile(user.id);
      
      if (!profile) {
        profile = await createUserProfile(user.id, user.user_metadata?.full_name);
        setShowOnboarding(true);
      }
      
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setUserProfile(null);
  };

  const handleLogoClick = () => {
    setCurrentView('coaching');
    navigate('/');
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
          </div>
          <p className="text-purple-300">Loading Goalify...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const renderNavigation = () => (
    <nav className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 shadow-2xl border-b border-purple-500/20 relative z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogoClick}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
              </div>
              
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Goalify
                </h1>
                <p className="text-xs text-purple-300 -mt-1">
                  {userProfile?.name ? `Welcome back, ${userProfile.name}` : 'Your AI Coaching Companion'}
                </p>
              </div>
            </button>
          </div>

          {userProfile && (
            <div className="hidden md:flex items-center space-x-4">
              {/* Level Display */}
              <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
                <span className="text-yellow-300 font-medium text-sm">Level {userProfile.level || 1}</span>
                <span className="text-yellow-200 text-xs">{userProfile.totalXP || 0} XP</span>
              </div>
              
              {/* Streak Display */}
              <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-orange-300 font-medium text-sm">{userProfile.dailyStreak || 0}</span>
                <span className="text-orange-200 text-xs">day streak</span>
              </div>
              
              {/* Goals Count */}
              <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                <span className="text-purple-300 font-medium text-sm">{goals.filter(g => g.completed).length}/{goals.length}</span>
                <span className="text-purple-200 text-xs">goals</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            {[
              { id: 'coaching', label: 'Coaching', icon: MessageCircle },
              { id: 'progress', label: 'Progress', icon: BarChart3 },
              { id: 'analysis', label: 'Analysis', icon: Brain },
              { id: 'settings', label: 'Settings', icon: SettingsIcon }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as AppView)}
                  className={`group relative flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    currentView === item.id 
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 shadow-lg' 
                      : 'text-purple-200 hover:text-white hover:bg-purple-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{item.label}</span>
                  {currentView === item.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-xl animate-pulse"></div>
                  )}
                </button>
              );
            })}
            
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-purple-200 hover:text-white hover:bg-red-500/10 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'coaching':
        return (
          <div className="h-[calc(100vh-4rem)] relative">
            <ConversationalCoach userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />
          </div>
        );
      case 'progress':
        return (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <ProgressDashboard userProfile={userProfile} />
          </div>
        );
      case 'analysis':
        return (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <UserAnalysis userProfile={userProfile} />
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-6xl mx-auto px-4 py-8">
            <Settings userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      {renderNavigation()}
      {renderContent()}

      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth" element={<AuthScreen />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}

export default App;
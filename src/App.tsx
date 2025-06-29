import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, BarChart3, Settings as SettingsIcon, LogOut, Flame, Brain, Menu, X } from 'lucide-react';
import { ConversationalCoach } from './components/ConversationalCoach';
import { AuthScreen } from './components/AuthScreen';
import { AuthCallback } from './components/AuthCallback';
import { OnboardingModal } from './components/OnboardingModal';
import { Footer } from './components/Footer';
import { useAuth } from './hooks/useAuth';
import { useOptimizedData } from './hooks/useOptimizedData';
import { updateDailyStreak } from './services/database';

// Lazy load heavy components
const LazyProgressDashboard = React.lazy(() => 
  import('./components/ProgressDashboard').then(module => ({ default: module.ProgressDashboard }))
);

const LazyUserAnalysis = React.lazy(() => 
  import('./components/UserAnalysis').then(module => ({ default: module.UserAnalysis }))
);

const LazySettings = React.lazy(() => 
  import('./components/Settings').then(module => ({ default: module.Settings }))
);

const LoadingFallback: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-purple-300">{text}</p>
    </div>
  </div>
);

type AppView = 'coaching' | 'progress' | 'analysis' | 'settings';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="full-height-layout bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
                <span className="text-white font-bold text-xl">G</span>
              </div>
            </div>
            <p className="text-purple-300">Loading Goalify...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function MainApp() {
  const { user, signOut } = useAuth();
  const { profile: userProfile, goals, loading: dataLoading, refreshData } = useOptimizedData();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<AppView>('coaching');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user && userProfile && !userProfile.name) {
      setShowOnboarding(true);
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (user) {
      updateDailyStreak(user.id);
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate('/auth', { replace: true });
  };

  const handleLogoClick = () => {
    setCurrentView('coaching');
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleViewChange = (view: AppView) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  if (dataLoading) {
    return (
      <div className="full-height-layout bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
                <span className="text-white font-bold text-xl">G</span>
              </div>
            </div>
            <p className="text-purple-300">Loading your data...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const renderNavigation = () => (
    <nav className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 shadow-2xl border-b border-purple-500/20 relative z-50 flex-shrink-0">
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

          {/* Desktop Stats */}
          {userProfile && (
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
                <span className="text-yellow-300 font-medium text-sm">Level {userProfile.level || 1}</span>
                <span className="text-yellow-200 text-xs">{userProfile.totalXP || 0} XP</span>
              </div>
              
              <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-orange-300 font-medium text-sm">{userProfile.dailyStreak || 0}</span>
                <span className="text-orange-200 text-xs">day streak</span>
              </div>
              
              <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                <span className="text-purple-300 font-medium text-sm">{goals.filter(g => g.completed).length}/{goals.length}</span>
                <span className="text-purple-200 text-xs">goals</span>
              </div>
            </div>
          )}

          {/* Mobile Stats */}
          {userProfile && (
            <div className="flex lg:hidden items-center space-x-2">
              <div className="flex items-center space-x-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-2 py-1 rounded-full border border-orange-500/30">
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-orange-300 font-medium text-xs">{userProfile.dailyStreak || 0}</span>
              </div>
              <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-2 py-1 rounded-full border border-yellow-500/30">
                <span className="text-yellow-300 font-medium text-xs">L{userProfile.level || 1}</span>
              </div>
            </div>
          )}
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
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
                  onClick={() => handleViewChange(item.id as AppView)}
                  className={`group relative flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                    currentView === item.id 
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 shadow-lg' 
                      : 'text-purple-200 hover:text-white hover:bg-purple-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {currentView === item.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-xl"></div>
                  )}
                </button>
              );
            })}
            
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-purple-200 hover:text-white hover:bg-red-500/10 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-purple-300" />
            ) : (
              <Menu className="w-5 h-5 text-purple-300" />
            )}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-purple-500/20 shadow-xl z-50">
            <div className="px-4 py-4 space-y-2">
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
                    onClick={() => handleViewChange(item.id as AppView)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      currentView === item.id 
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300' 
                        : 'text-purple-200 hover:text-white hover:bg-purple-500/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-red-300 hover:text-white hover:bg-red-500/10 transition-all duration-300"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>

              {/* Mobile Stats Summary */}
              {userProfile && (
                <div className="mt-4 pt-4 border-t border-purple-500/20">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-2 rounded-lg border border-yellow-500/30">
                      <div className="text-yellow-300 font-bold text-sm">Level {userProfile.level || 1}</div>
                      <div className="text-yellow-200 text-xs">{userProfile.totalXP || 0} XP</div>
                    </div>
                    <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-2 rounded-lg border border-orange-500/30">
                      <div className="text-orange-300 font-bold text-sm">{userProfile.dailyStreak || 0}</div>
                      <div className="text-orange-200 text-xs">day streak</div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-3 py-2 rounded-lg border border-purple-500/30">
                      <div className="text-purple-300 font-bold text-sm">{goals.filter(g => g.completed).length}/{goals.length}</div>
                      <div className="text-purple-200 text-xs">goals</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'coaching':
        return (
          <div className="flex-1 min-h-0">
            <ConversationalCoach userProfile={userProfile} onProfileUpdate={refreshData} />
          </div>
        );
      case 'progress':
        return (
          <div className="flex-1 scrollable-container">
            <div className="max-w-6xl mx-auto px-4 py-8">
              <React.Suspense fallback={<LoadingFallback text="Loading dashboard..." />}>
                <LazyProgressDashboard userProfile={userProfile} />
              </React.Suspense>
            </div>
          </div>
        );
      case 'analysis':
        return (
          <div className="flex-1 scrollable-container">
            <div className="max-w-6xl mx-auto px-4 py-8">
              <React.Suspense fallback={<LoadingFallback text="Loading analysis..." />}>
                <LazyUserAnalysis userProfile={userProfile} />
              </React.Suspense>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex-1 scrollable-container">
            <div className="max-w-6xl mx-auto px-4 py-8">
              <React.Suspense fallback={<LoadingFallback text="Loading settings..." />}>
                <LazySettings userProfile={userProfile} onProfileUpdate={refreshData} />
              </React.Suspense>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="full-height-layout bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      {renderNavigation()}
      {renderContent()}
      <Footer />

      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Auth routes - accessible without authentication */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth" element={
        <div className="full-height-layout">
          <div className="flex-1">
            <AuthScreen />
          </div>
          <Footer />
        </div>
      } />
      
      {/* Protected routes - require authentication */}
      <Route path="/*" element={
        <ProtectedRoute>
          <MainApp />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
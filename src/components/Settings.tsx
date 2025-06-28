import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Volume2, Brain, Palette, Key } from 'lucide-react';
import { updateUserProfile } from '../services/database';
import { UserProfile } from '../types/coaching';

interface SettingsProps {
  userProfile: UserProfile | null;
  onProfileUpdate: (profile: UserProfile) => void;
}

export const Settings: React.FC<SettingsProps> = ({ userProfile, onProfileUpdate }) => {
  const [profile, setProfile] = useState<UserProfile>(userProfile || {
    preferences: {
      voiceEnabled: false,
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      memoryEnabled: true,
      tone: 'casual'
    },
    longTermGoals: [],
    currentChallenges: [],
    totalXP: 0,
    level: 1,
    achievements: []
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile]);

  const updatePreference = (key: keyof UserProfile['preferences'], value: any) => {
    setProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  const updateProfile = (key: keyof UserProfile, value: any) => {
    setProfile(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveProfile = async () => {
    if (!userProfile?.id) return;

    setSaving(true);
    setSaveMessage('');

    try {
      await updateUserProfile(userProfile.id, profile);
      onProfileUpdate(profile);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="relative mx-auto w-16 h-16 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
            <SettingsIcon className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">⚙️ Settings</h2>
        <p className="text-purple-300">Customize your coaching experience</p>
      </div>

      {/* Personal Information */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
        <div className="p-6 border-b border-purple-500/20">
          <h3 className="text-lg font-semibold text-white">Personal Information</h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={profile.name || ''}
              onChange={(e) => updateProfile('name', e.target.value)}
              placeholder="How would you like to be addressed?"
              className="w-full p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400"
            />
          </div>
        </div>
      </div>

      {/* Voice Settings */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
        <div className="p-6 border-b border-purple-500/20">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Voice Settings</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Enable Voice Responses</h4>
              <p className="text-sm text-purple-300">Hear AI responses spoken aloud</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profile.preferences.voiceEnabled}
                onChange={(e) => updatePreference('voiceEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Voice ID (ElevenLabs)
            </label>
            <input
              type="text"
              value={profile.preferences.voiceId}
              onChange={(e) => updatePreference('voiceId', e.target.value)}
              placeholder="21m00Tcm4TlvDq8ikWAM"
              className="w-full p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400"
            />
            <p className="text-xs text-purple-400 mt-1">
              Get voice IDs from your ElevenLabs dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Coaching Preferences */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
        <div className="p-6 border-b border-purple-500/20">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Coaching Preferences</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Remember Previous Sessions</h4>
              <p className="text-sm text-purple-300">Allow AI to reference past conversations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={profile.preferences.memoryEnabled}
                onChange={(e) => updatePreference('memoryEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Conversation Tone
            </label>
            <select
              value={profile.preferences.tone}
              onChange={(e) => updatePreference('tone', e.target.value)}
              className="w-full p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400"
            >
              <option value="casual">Casual & Friendly</option>
              <option value="formal">Professional & Formal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Long-term Goals */}
      <div className="bg-gradient-to-r from-slate-800/50 to-purple-800/30 rounded-xl border border-purple-500/20 backdrop-blur-sm">
        <div className="p-6 border-b border-purple-500/20">
          <h3 className="text-lg font-semibold text-white">Long-term Goals</h3>
        </div>
        
        <div className="p-6">
          <textarea
            value={profile.longTermGoals.join('\n')}
            onChange={(e) => updateProfile('longTermGoals', e.target.value.split('\n').filter(g => g.trim()))}
            placeholder="Enter your long-term goals, one per line..."
            rows={4}
            className="w-full p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 resize-none"
          />
          <p className="text-xs text-purple-400 mt-1">
            These help the AI provide more relevant coaching
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-center">
        <button
          onClick={saveProfile}
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <SettingsIcon className="w-4 h-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`text-center p-3 rounded-lg ${
          saveMessage.includes('Error') 
            ? 'bg-red-500/10 border border-red-500/20 text-red-300' 
            : 'bg-green-500/10 border border-green-500/20 text-green-300'
        }`}>
          {saveMessage}
        </div>
      )}
    </div>
  );
};
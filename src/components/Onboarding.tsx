import React, { useState } from 'react';
import { CheckCircle, Clock, Shield, MessageCircle } from 'lucide-react';

interface OnboardingProps {
  onComplete: (sessionLength: number, understood: boolean) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [sessionLength, setSessionLength] = useState(30);
  const [understood, setUnderstood] = useState(false);

  const handleContinue = () => {
    if (understood) {
      onComplete(sessionLength, understood);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <MessageCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to AI Coach</h1>
        <p className="text-lg text-gray-600">Your personal coaching companion using the TGROW model</p>
      </div>

      <div className="space-y-6 mb-8">
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How This Works</h2>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">T</div>
              <div>
                <h3 className="font-medium text-gray-900">Topic</h3>
                <p className="text-gray-600 text-sm">What would you like to focus on today?</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold">G</div>
              <div>
                <h3 className="font-medium text-gray-900">Goal</h3>
                <p className="text-gray-600 text-sm">What do you want to achieve from this session?</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">R</div>
              <div>
                <h3 className="font-medium text-gray-900">Reality</h3>
                <p className="text-gray-600 text-sm">Where are you now in relation to your goal?</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold">O</div>
              <div>
                <h3 className="font-medium text-gray-900">Options</h3>
                <p className="text-gray-600 text-sm">What could you do? Let's explore possibilities.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">W</div>
              <div>
                <h3 className="font-medium text-gray-900">What Next</h3>
                <p className="text-gray-600 text-sm">What will you commit to doing and when?</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Shield className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold text-gray-900">Confidentiality & Privacy</h3>
          </div>
          <p className="text-gray-600 text-sm">
            This is a safe space for reflection. All conversations remain private unless you choose to export them. 
            This is not therapy or medical advice - it's a structured conversation to help you think and plan.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              How much time do you have for this session?
            </label>
            <select 
              value={sessionLength} 
              onChange={(e) => setSessionLength(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              I understand this is a reflective space for coaching, not therapy or advice. 
              I'm ready to engage in a structured conversation where I'll do most of the thinking and talking.
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!understood}
        className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
          understood 
            ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl' 
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {understood ? 'Begin Coaching Session' : 'Please confirm understanding to continue'}
      </button>
    </div>
  );
};
import React, { useState } from 'react';
import { MessageCircle, X, Sparkles, Target, TrendingUp } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Goalogue!",
      content: (
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-20 h-20">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-2xl">G</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-30"></div>
          </div>
          <p className="text-lg text-gray-300">
            Your AI coaching companion for meaningful conversations and personal growth.
          </p>
          <p className="text-purple-300 font-medium">
            Talk or type your way to clarity. Ready to begin?
          </p>
        </div>
      )
    },
    {
      title: "How It Works",
      content: (
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Natural Conversations</h3>
              <p className="text-gray-300 text-sm">
                Share what's on your mind through voice or text. I'll listen and ask thoughtful questions to help you think deeper.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Goal-Focused Guidance</h3>
              <p className="text-gray-300 text-sm">
                Using proven coaching methods, we'll explore your goals, current reality, options, and next steps.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Track Your Growth</h3>
              <p className="text-gray-300 text-sm">
                Review past conversations, monitor your progress, and celebrate your achievements.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Your Interface",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-purple-300 font-medium">Session History</span>
              <span className="text-gray-400">← Left sidebar</span>
            </div>
            <p className="text-gray-300 text-sm">View your past conversations here</p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-blue-300 font-medium">Goal Tracking</span>
              <span className="text-gray-400">Right sidebar →</span>
            </div>
            <p className="text-gray-300 text-sm">Monitor your growth and achievements</p>
          </div>
          
          <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-lg p-4 border border-pink-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span className="text-pink-300 font-medium">Voice & Text</span>
            </div>
            <p className="text-gray-300 text-sm">Switch seamlessly between speaking and typing</p>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/20">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index <= step ? 'bg-purple-400' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onComplete}
              className="p-2 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">{steps[step].title}</h2>
            {steps[step].content}
          </div>

          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                step === 0
                  ? 'text-gray-500 cursor-not-allowed'
                  : 'text-purple-300 hover:text-white hover:bg-purple-500/20'
              }`}
            >
              Previous
            </button>
            
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {step === steps.length - 1 ? "Let's Begin!" : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
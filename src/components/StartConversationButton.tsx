import React from 'react';
import { MessageCircle, Mic, Sparkles, Target } from 'lucide-react';

interface StartConversationButtonProps {
  onStart: () => void;
}

export const StartConversationButton: React.FC<StartConversationButtonProps> = ({ onStart }) => {
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <div className="text-center space-y-8 max-w-lg px-6">
        {/* Animated Logo */}
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
            <MessageCircle className="w-12 h-12 text-white" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Welcome Text */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white">
            Ready to explore your thoughts?
          </h1>
          <p className="text-purple-300 text-lg leading-relaxed">
            I'm here to listen, ask thoughtful questions, and help you discover your own answers through meaningful conversation.
          </p>
          
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center space-x-3 mb-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">Natural Conversation</span>
              </div>
              <p className="text-purple-300 text-sm">Type or speak naturally - I'll listen and respond thoughtfully</p>
            </div>
            
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center space-x-3 mb-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">Goal-Focused</span>
              </div>
              <p className="text-purple-300 text-sm">Together we'll identify challenges and create actionable goals</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-purple-400 mt-6">
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4" />
              <span>Type</span>
            </div>
            <span>or</span>
            <div className="flex items-center space-x-1">
              <Mic className="w-4 h-4" />
              <span>Speak</span>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={onStart}
          className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-purple-500/25"
        >
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 group-hover:animate-bounce" />
            <span>Start Conversation</span>
          </div>
          
          {/* Animated border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 opacity-0 group-hover:opacity-20 animate-pulse"></div>
        </button>

        {/* Helpful Tips */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20 backdrop-blur-sm">
          <div className="space-y-3">
            <p className="text-purple-300 text-sm">
              💡 <strong className="text-white">Tip:</strong> Share what's on your mind, and I'll help you think through it step by step.
            </p>
            <p className="text-purple-300 text-sm">
              🎯 After our conversation, I'll suggest a specific challenge to help you take action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
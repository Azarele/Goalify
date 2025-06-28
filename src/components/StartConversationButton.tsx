import React from 'react';
import { MessageCircle, Mic, Sparkles } from 'lucide-react';

interface StartConversationButtonProps {
  onStart: () => void;
}

export const StartConversationButton: React.FC<StartConversationButtonProps> = ({ onStart }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-8 max-w-md">
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
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white">
            Ready to explore your thoughts?
          </h2>
          <p className="text-purple-300 text-lg">
            I'm here to listen, ask thoughtful questions, and help you discover your own answers.
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-purple-400">
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
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20 backdrop-blur-sm">
          <p className="text-purple-300 text-sm">
            💡 <strong>Tip:</strong> Share what's on your mind, and I'll help you think through it step by step.
          </p>
        </div>
      </div>
    </div>
  );
};
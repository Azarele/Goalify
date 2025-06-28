import React from 'react';
import { Volume2 } from 'lucide-react';

export const VoiceIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-full border border-purple-500/30 animate-fade-in backdrop-blur-sm">
      <div className="relative">
        <Volume2 className="w-4 h-4" />
        <div className="absolute inset-0 animate-ping">
          <Volume2 className="w-4 h-4 opacity-30" />
        </div>
      </div>
      <div className="flex space-x-1">
        <div className="w-1 h-3 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-bounce"></div>
        <div className="w-1 h-4 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-1 h-2 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-1 h-4 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        <div className="w-1 h-3 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
      <span className="text-xs font-medium">Speaking...</span>
    </div>
  );
};
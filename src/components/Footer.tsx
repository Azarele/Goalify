import React from 'react';
import { Zap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-t border-purple-500/20 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center">
          <a
            href="https://bolt.new"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-all duration-300 transform hover:scale-105"
          >
            <span className="text-sm font-medium">Powered by</span>
            <div className="flex items-center space-x-1">
              <div className="relative">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-md flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-md opacity-0 group-hover:opacity-20 animate-ping"></div>
              </div>
              <span className="font-bold text-white group-hover:bg-gradient-to-r group-hover:from-yellow-400 group-hover:to-orange-500 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                Bolt.new
              </span>
            </div>
          </a>
        </div>
      </div>
    </footer>
  );
};
import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  enableVoiceSync?: boolean;
  shouldStart?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({ 
  text, 
  speed = 50, 
  onComplete,
  onProgress,
  enableVoiceSync = false,
  shouldStart = true
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // ENHANCED: Only start typing when shouldStart is true (for voice sync)
    if (!shouldStart && enableVoiceSync) {
      return;
    }

    if (!hasStarted && shouldStart) {
      setHasStarted(true);
    }

    if (hasStarted && currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        
        // Report progress for voice synchronization
        if (onProgress) {
          const progress = (currentIndex + 1) / text.length;
          onProgress(progress);
        }
      }, speed);

      return () => clearTimeout(timer);
    } else if (hasStarted && currentIndex >= text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete, onProgress, shouldStart, enableVoiceSync, hasStarted]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setHasStarted(!enableVoiceSync); // Start immediately if not voice synced
  }, [text, enableVoiceSync]);

  return (
    <div className="text-sm leading-relaxed">
      {displayedText}
      {hasStarted && currentIndex < text.length && (
        <span className={`${enableVoiceSync ? 'animate-pulse text-purple-400' : 'animate-pulse text-purple-400'}`}>|</span>
      )}
    </div>
  );
};
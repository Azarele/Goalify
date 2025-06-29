export interface VoiceSettings {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceId: import.meta.env.VITE_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
  stability: 0.75, // Higher for more consistent character
  similarityBoost: 0.85, // Higher for better voice quality
  style: 0.3, // Add some personality
  useSpeakerBoost: true
};

const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
const isElevenLabsConfigured = Boolean(apiKey && apiKey.length > 10);

// Log configuration status
if (isElevenLabsConfigured) {
  console.log('✅ ElevenLabs configured successfully with enhanced voice');
} else {
  console.log('⚠️ ElevenLabs not configured - voice features disabled');
}

// Enhanced voice generation with character and emotion
export const generateSpeech = async (
  text: string, 
  settings: Partial<VoiceSettings> = {},
  emotion: 'supportive' | 'encouraging' | 'understanding' | 'excited' | 'calm' = 'supportive'
): Promise<ArrayBuffer> => {
  if (!apiKey || !isElevenLabsConfigured) {
    throw new Error('ElevenLabs API key not configured - voice features disabled');
  }

  const voiceSettings = { ...DEFAULT_VOICE_SETTINGS, ...settings };

  // Adjust voice settings based on emotion
  let adjustedSettings = { ...voiceSettings };
  switch (emotion) {
    case 'encouraging':
      adjustedSettings.stability = 0.8;
      adjustedSettings.style = 0.4;
      break;
    case 'understanding':
      adjustedSettings.stability = 0.9;
      adjustedSettings.style = 0.2;
      break;
    case 'excited':
      adjustedSettings.stability = 0.6;
      adjustedSettings.style = 0.6;
      break;
    case 'calm':
      adjustedSettings.stability = 0.95;
      adjustedSettings.style = 0.1;
      break;
    default: // supportive
      adjustedSettings.stability = 0.75;
      adjustedSettings.style = 0.3;
  }

  // Add coaching personality to the text
  const enhancedText = addCoachingPersonality(text, emotion);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${adjustedSettings.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: enhancedText,
          model_id: 'eleven_multilingual_v2', // Better model for character
          voice_settings: {
            stability: adjustedSettings.stability,
            similarity_boost: adjustedSettings.similarityBoost,
            style: adjustedSettings.style,
            use_speaker_boost: adjustedSettings.useSpeakerBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('ElevenLabs API error:', error);
    throw error;
  }
};

// Add coaching personality and moral guidance to text
const addCoachingPersonality = (text: string, emotion: string): string => {
  // Remove any [GOAL] tags for voice
  let cleanText = text.replace(/\[GOAL\]/g, '');
  
  // Don't modify if text is already personalized or very short
  if (cleanText.length < 10 || 
      cleanText.includes('I understand') || 
      cleanText.includes('That sounds') ||
      cleanText.includes('I hear you')) {
    return cleanText;
  }

  // Add personality based on content and emotion
  if (cleanText.includes('?')) {
    // Questions - make them more engaging
    switch (emotion) {
      case 'encouraging':
        if (Math.random() > 0.5) {
          cleanText = `I'm curious - ${cleanText.toLowerCase()}`;
        }
        break;
      case 'understanding':
        if (Math.random() > 0.5) {
          cleanText = `I'd love to understand - ${cleanText.toLowerCase()}`;
        }
        break;
      case 'supportive':
        if (Math.random() > 0.5) {
          cleanText = `Help me understand - ${cleanText.toLowerCase()}`;
        }
        break;
    }
  } else if (cleanText.includes('goal') || cleanText.includes('challenge')) {
    // Goal-related responses - add encouragement
    const encouragements = [
      "That's a meaningful step forward. ",
      "I believe in your ability to achieve this. ",
      "This shows real self-awareness. ",
      "You're taking ownership of your growth. "
    ];
    if (Math.random() > 0.6) {
      cleanText = encouragements[Math.floor(Math.random() * encouragements.length)] + cleanText;
    }
  }

  return cleanText;
};

// Enhanced audio playback with synchronized timing
export const playAudioSynchronized = (
  audioBuffer: ArrayBuffer, 
  textLength: number,
  onProgress?: (progress: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      audioContext.decodeAudioData(audioBuffer)
        .then(decodedData => {
          const source = audioContext.createBufferSource();
          source.buffer = decodedData;
          source.connect(audioContext.destination);
          
          const duration = decodedData.duration;
          let startTime = audioContext.currentTime;
          
          // Progress tracking for synchronization
          if (onProgress) {
            const progressInterval = setInterval(() => {
              const elapsed = audioContext.currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              onProgress(progress);
              
              if (progress >= 1) {
                clearInterval(progressInterval);
              }
            }, 50); // Update every 50ms for smooth sync
            
            source.onended = () => {
              clearInterval(progressInterval);
              onProgress(1);
              resolve();
            };
          } else {
            source.onended = () => resolve();
          }
          
          source.start();
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
};

// Legacy function for backward compatibility
export const playAudio = (audioBuffer: ArrayBuffer): Promise<void> => {
  return playAudioSynchronized(audioBuffer, 0);
};

// Determine emotion from AI response content
export const determineEmotion = (content: string): 'supportive' | 'encouraging' | 'understanding' | 'excited' | 'calm' => {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('great') || lowerContent.includes('excellent') || lowerContent.includes('perfect')) {
    return 'excited';
  }
  
  if (lowerContent.includes('understand') || lowerContent.includes('hear you') || lowerContent.includes('feel')) {
    return 'understanding';
  }
  
  if (lowerContent.includes('can do') || lowerContent.includes('believe') || lowerContent.includes('capable')) {
    return 'encouraging';
  }
  
  if (lowerContent.includes('take your time') || lowerContent.includes('no pressure') || lowerContent.includes('when ready')) {
    return 'calm';
  }
  
  return 'supportive'; // Default
};

export { isElevenLabsConfigured };
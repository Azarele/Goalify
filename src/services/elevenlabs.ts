export interface VoiceSettings {
  voiceId: string;
  stability: number;
  similarityBoost: number;
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceId: import.meta.env.VITE_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
  stability: 0.5,
  similarityBoost: 0.75
};

const isElevenLabsConfigured = Boolean(import.meta.env.VITE_ELEVENLABS_API_KEY);

export const generateSpeech = async (
  text: string, 
  settings: Partial<VoiceSettings> = {}
): Promise<ArrayBuffer> => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  
  if (!apiKey || !isElevenLabsConfigured) {
    throw new Error('ElevenLabs API key not configured - voice features disabled in demo mode');
  }

  const voiceSettings = { ...DEFAULT_VOICE_SETTINGS, ...settings };

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('ElevenLabs API error:', error);
    throw error;
  }
};

export const playAudio = (audioBuffer: ArrayBuffer): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audioContext = new AudioContext();
    
    audioContext.decodeAudioData(audioBuffer)
      .then(decodedData => {
        const source = audioContext.createBufferSource();
        source.buffer = decodedData;
        source.connect(audioContext.destination);
        source.onended = () => resolve();
        source.start();
      })
      .catch(reject);
  });
};

export { isElevenLabsConfigured };
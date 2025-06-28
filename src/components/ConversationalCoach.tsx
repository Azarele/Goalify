import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Mic, MicOff, Volume2, VolumeX, Send, Loader, Menu, Sidebar } from 'lucide-react';
import { Message, CoachingSession, ConversationContext, UserProfile } from '../types/coaching';
import { generateCoachingResponse, generateGoalFromConversation, isOpenAIConfigured } from '../services/openai';
import { generateSpeech, playAudio, isElevenLabsConfigured } from '../services/elevenlabs';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { saveSession, saveGoal, updateDailyStreak } from '../services/database';
import { useAuth } from '../hooks/useAuth';
import { TypewriterText } from './TypewriterText';
import { VoiceIndicator } from './VoiceIndicator';
import { SessionSidebar } from './SessionSidebar';
import { GoalSidebar } from './GoalSidebar';
import { StartConversationButton } from './StartConversationButton';

interface ConversationalCoachProps {
  session: CoachingSession | null;
  onSessionStart: (session: CoachingSession) => void;
  onSessionUpdate: (session: CoachingSession) => void;
  userProfile: UserProfile | null;
}

export const ConversationalCoach: React.FC<ConversationalCoachProps> = ({
  session,
  onSessionStart,
  onSessionUpdate,
  userProfile
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentlyTyping, setCurrentlyTyping] = useState<string | null>(null);
  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [goalSetInSession, setGoalSetInSession] = useState(false);
  const [context, setContext] = useState<ConversationContext>({
    exploredOptions: [],
    identifiedActions: [],
    growStage: 'exploring'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    transcript,
    isListening,
    isSupported: speechSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  useEffect(() => {
    if (userProfile) {
      setVoiceEnabled(userProfile.preferences.voiceEnabled && isElevenLabsConfigured);
    }
  }, [userProfile]);

  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (session) {
      setMessages(session.messages || []);
      setHasStartedSession(true);
      setMessageCount(session.messages?.length || 0);
      
      // Check if a goal has already been set in this session
      const hasGoalMessage = session.messages?.some(m => 
        m.role === 'assistant' && 
        m.content.toLowerCase().includes('can i set a small challenge for you')
      );
      setGoalSetInSession(hasGoalMessage || false);
    }
  }, [session]);

  const createNewSession = (): CoachingSession => {
    return {
      id: `session_${Date.now()}`,
      date: new Date(),
      messages: [],
      goals: [],
      insights: [],
      actions: [],
      completed: false
    };
  };

  const handleStartConversation = async () => {
    if (!user) return;

    const greeting = userProfile?.name 
      ? `Hi ${userProfile.name}! I'm your AI Coach. ${!isOpenAIConfigured ? '(Demo mode - limited AI features) ' : ''}What would you like to focus on today?`
      : `Hi! I'm your AI Coach. ${!isOpenAIConfigured ? '(Demo mode - limited AI features) ' : ''}What would you like to focus on today?`;
    
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date()
    };

    const newSession = createNewSession();
    newSession.messages = [assistantMessage];
    
    setMessages([assistantMessage]);
    setCurrentlyTyping(assistantMessage.id);
    setHasStartedSession(true);
    setGoalSetInSession(false);
    onSessionStart(newSession);
    
    try {
      await saveSession(user.id, newSession);
    } catch (error) {
      console.error('Error saving session:', error);
    }
    
    setTimeout(() => {
      setCurrentlyTyping(null);
      if (voiceEnabled && isElevenLabsConfigured) {
        playCoachResponse(greeting);
      }
    }, greeting.length * 30);
  };

  const playCoachResponse = async (text: string) => {
    if (!userProfile?.preferences.voiceEnabled || !isElevenLabsConfigured) return;
    
    try {
      setIsPlayingAudio(true);
      const audioBuffer = await generateSpeech(text, {
        voiceId: userProfile.preferences.voiceId
      });
      await playAudio(audioBuffer);
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const analyzeConversationContext = (messages: Message[]): ConversationContext => {
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    const lastFewMessages = userMessages.slice(-3).join(' ').toLowerCase();

    let stage: ConversationContext['growStage'] = 'exploring';
    
    if (lastFewMessages.includes('want to') || lastFewMessages.includes('goal') || lastFewMessages.includes('achieve')) {
      stage = 'goal';
    } else if (lastFewMessages.includes('currently') || lastFewMessages.includes('right now') || lastFewMessages.includes('situation')) {
      stage = 'reality';
    } else if (lastFewMessages.includes('could') || lastFewMessages.includes('options') || lastFewMessages.includes('possibilities')) {
      stage = 'options';
    } else if (lastFewMessages.includes('will do') || lastFewMessages.includes('next step') || lastFewMessages.includes('commit')) {
      stage = 'action';
    }

    return {
      ...context,
      growStage: stage
    };
  };

  const generateGoalIfNeeded = async (messages: Message[], currentSession: CoachingSession) => {
    if (!user || goalSetInSession) return null;

    const userMessages = messages.filter(m => m.role === 'user');
    
    // Generate goal after 2-4 user exchanges
    if (userMessages.length >= 2 && userMessages.length <= 4) {
      const conversationHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const generatedGoal = await generateGoalFromConversation(conversationHistory);
      
      if (generatedGoal) {
        const goal = {
          id: Date.now().toString(),
          description: generatedGoal.description,
          xpValue: generatedGoal.xpValue,
          difficulty: generatedGoal.difficulty,
          motivation: 7,
          completed: false,
          createdAt: new Date(),
          deadline: new Date(Date.now() + (generatedGoal.timeframe === '24 hours' ? 86400000 : 
                                         generatedGoal.timeframe === '3 days' ? 259200000 : 604800000))
        };
        
        try {
          await saveGoal(user.id, currentSession.id, goal);
          setGoalSetInSession(true);
        } catch (error) {
          console.error('Error saving goal:', error);
        }
        
        const goalMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `Based on what you've shared, can I set a small challenge for you? Here's what I'm thinking: "${generatedGoal.description}" - does this feel achievable and relevant to what we've been discussing?`,
          timestamp: new Date()
        };
        
        return goalMessage;
      }
    }
    return null;
  };

  const generateFollowUpMessage = (messages: Message[]): Message | null => {
    // Only generate follow-up if goal was just set
    if (!goalSetInSession) return null;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && 
        lastMessage.content.toLowerCase().includes('can i set a small challenge for you')) {
      
      return {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: "Is there anything else I can help you with today?",
        timestamp: new Date()
      };
    }
    
    return null;
  };

  const sendMessage = async (content: string, isVoice = false) => {
    if (!content.trim() || isLoading || !user) return;

    setIsLoading(true);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      isVoice
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    resetTranscript();
    setMessageCount(newMessages.length);

    let currentSession = session;
    if (!currentSession) {
      currentSession = createNewSession();
      currentSession.messages = newMessages;
      onSessionStart(currentSession);
    } else {
      currentSession.messages = newMessages;
    }

    try {
      const newContext = analyzeConversationContext(newMessages);
      setContext(newContext);

      // Check if user is indicating they're done
      const userResponse = content.toLowerCase().trim();
      const isDone = userResponse === 'no' || 
                     userResponse.includes('no thanks') || 
                     userResponse.includes("i'm good") ||
                     userResponse.includes("that's all") ||
                     userResponse.includes('nothing else');

      if (goalSetInSession && isDone) {
        const conclusionMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Perfect! You're all set. Take your time working on your challenge, and remember you can always come back here when you're ready to mark it complete or if you need any other support. Good luck!",
          timestamp: new Date()
        };

        const finalMessages = [...newMessages, conclusionMessage];
        setMessages(finalMessages);
        setCurrentlyTyping(conclusionMessage.id);

        setTimeout(() => {
          setCurrentlyTyping(null);
          if (voiceEnabled && isElevenLabsConfigured) {
            playCoachResponse(conclusionMessage.content);
          }
        }, conclusionMessage.content.length * 25);

        const updatedSession = {
          ...currentSession,
          messages: finalMessages,
          completed: true
        };
        onSessionUpdate(updatedSession);
        await saveSession(user.id, updatedSession);
        setIsLoading(false);
        return;
      }

      const response = await generateCoachingResponse({
        messages: newMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        context: {
          userName: userProfile?.name,
          previousGoals: userProfile?.longTermGoals,
          currentStage: newContext.growStage,
          goalAlreadySet: goalSetInSession
        }
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      let finalMessages = [...newMessages, assistantMessage];

      // Try to generate a goal if conditions are met
      const goalMessage = await generateGoalIfNeeded(finalMessages, currentSession);
      if (goalMessage) {
        finalMessages = [...finalMessages, goalMessage];
        
        // Add the follow-up question after goal setting
        const followUpMessage = generateFollowUpMessage(finalMessages);
        if (followUpMessage) {
          finalMessages = [...finalMessages, followUpMessage];
        }
      }

      setMessages(finalMessages);
      setCurrentlyTyping(assistantMessage.id);

      setTimeout(async () => {
        setCurrentlyTyping(null);
        if (voiceEnabled && isElevenLabsConfigured) {
          await playCoachResponse(response);
        }
      }, response.length * 25);

      const updatedSession = {
        ...currentSession,
        messages: finalMessages
      };
      onSessionUpdate(updatedSession);

      await saveSession(user.id, updatedSession);

    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Could you try again?",
        timestamp: new Date()
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        sendMessage(transcript, true);
      }
    } else {
      resetTranscript();
      startListening();
    }
  };

  const getStageInfo = () => {
    const stageMap = {
      exploring: { label: 'Exploring your thoughts', color: 'from-blue-500 to-purple-500', icon: '🧭' },
      goal: { label: 'Clarifying your goals', color: 'from-purple-500 to-pink-500', icon: '🎯' },
      reality: { label: 'Understanding your situation', color: 'from-pink-500 to-red-500', icon: '👁️' },
      options: { label: 'Exploring possibilities', color: 'from-orange-500 to-yellow-500', icon: '💡' },
      action: { label: 'Planning next steps', color: 'from-green-500 to-blue-500', icon: '✅' }
    };
    return stageMap[context.growStage];
  };

  const stageInfo = getStageInfo();

  if (!hasStartedSession) {
    return (
      <div className="flex h-full relative">
        <StartConversationButton onStart={handleStartConversation} />
      </div>
    );
  }

  return (
    <div className="flex h-full relative">
      <SessionSidebar 
        isOpen={leftSidebarOpen}
        onClose={() => setLeftSidebarOpen(false)}
        currentSession={session}
        userProfile={userProfile}
      />

      <GoalSidebar 
        isOpen={rightSidebarOpen}
        onClose={() => setRightSidebarOpen(false)}
        currentSession={session}
        context={context}
        userProfile={userProfile}
      />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto relative">
        <div className="bg-gradient-to-r from-slate-800/90 to-purple-800/90 backdrop-blur-sm border-b border-purple-500/20 p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 animate-pulse"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setLeftSidebarOpen(true)}
                className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-all duration-300 lg:hidden group"
              >
                <Menu className="w-5 h-5 text-purple-300 group-hover:text-white" />
              </button>
              
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-ping opacity-20"></div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-white">AI Coach</h2>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stageInfo.color} animate-pulse`}></div>
                  <p className="text-sm text-purple-200">
                    {stageInfo.icon} {stageInfo.label}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isElevenLabsConfigured && (
                <button
                  onClick={toggleVoice}
                  className={`p-3 rounded-full transition-all duration-300 transform hover:scale-105 ${
                    voiceEnabled 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                      : 'bg-slate-700 text-purple-300 hover:bg-slate-600'
                  }`}
                  title={voiceEnabled ? 'Voice enabled' : 'Voice disabled'}
                >
                  {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              )}
              
              <button
                onClick={() => setRightSidebarOpen(true)}
                className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-all duration-300 lg:hidden group"
              >
                <Sidebar className="w-5 h-5 text-purple-300 group-hover:text-white" />
              </button>
              
              {isPlayingAudio && (
                <VoiceIndicator />
              )}
            </div>
          </div>

          {!isOpenAIConfigured && (
            <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
              <p className="text-yellow-300 text-xs text-center">
                Demo mode: Limited AI features. Configure OpenAI API key for full functionality.
              </p>
            </div>
          )}
        </div>

        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-800 chat-scroll"
        >
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700 text-white transform hover:scale-105 shadow-purple-500/25'
                    : 'bg-gradient-to-br from-slate-800 to-slate-700 text-white border border-purple-500/20 shadow-purple-500/10'
                }`}
              >
                {message.role === 'assistant' && currentlyTyping === message.id ? (
                  <TypewriterText text={message.content} speed={25} />
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {message.isVoice && (
                    <div className="flex items-center space-x-1">
                      <Mic className="w-3 h-3 opacity-70" />
                      <span className="text-xs opacity-70">Voice</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 text-white px-6 py-4 rounded-2xl shadow-xl border border-purple-500/20">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-purple-200">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-gradient-to-r from-slate-800/90 to-purple-800/90 backdrop-blur-sm border-t border-purple-500/20 p-6">
          <form onSubmit={handleSubmit} className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? "🎤 Listening..." : "Share what's on your mind..."}
                className={`w-full p-4 pr-14 border-2 rounded-2xl bg-slate-700/50 text-white placeholder-purple-300 focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400 transition-all duration-300 backdrop-blur-sm ${
                  isListening ? 'border-pink-400 bg-pink-500/10' : 'border-purple-500/30'
                }`}
                disabled={isLoading || isListening}
              />
              
              {speechSupported && (
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all duration-300 ${
                    isListening 
                      ? 'bg-pink-500/20 text-pink-400 animate-pulse' 
                      : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 hover:scale-110'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
            </div>
            
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`p-4 rounded-2xl font-medium transition-all duration-300 transform ${
                inputText.trim() && !isLoading
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:scale-105'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          
          {isListening && (
            <div className="mt-4 text-center animate-fade-in">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-pink-500/10 text-pink-300 rounded-full border border-pink-500/20 backdrop-blur-sm">
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Listening... Speak now</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setLeftSidebarOpen(true)}
        className="hidden lg:block fixed left-6 top-1/2 transform -translate-y-1/2 p-3 bg-gradient-to-br from-slate-800 to-purple-800 rounded-full shadow-lg border border-purple-500/20 hover:shadow-xl transition-all duration-300 hover:scale-110 z-10 backdrop-blur-sm"
        title="📜 Session History"
      >
        <Menu className="w-5 h-5 text-purple-300" />
      </button>

      <button
        onClick={() => setRightSidebarOpen(true)}
        className="hidden lg:block fixed right-6 top-1/2 transform -translate-y-1/2 p-3 bg-gradient-to-br from-slate-800 to-purple-800 rounded-full shadow-lg border border-purple-500/20 hover:shadow-xl transition-all duration-300 hover:scale-110 z-10 backdrop-blur-sm"
        title="🎯 Goal Tracking"
      >
        <Sidebar className="w-5 h-5 text-purple-300" />
      </button>
    </div>
  );
};
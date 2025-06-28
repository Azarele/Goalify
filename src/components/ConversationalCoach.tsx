import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Mic, MicOff, Volume2, VolumeX, Send, Loader, Menu, Sidebar, RotateCcw, Clock, Target, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ConversationContext, UserProfile } from '../types/coaching';
import { generateCoachingResponse, generateGoalFromConversation, isOpenAIConfigured, AIState } from '../services/openai';
import { generateSpeech, playAudio, isElevenLabsConfigured } from '../services/elevenlabs';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { createConversation, getConversationMessages, saveMessage, updateConversation, saveGoal, updateDailyStreak } from '../services/database';
import { useAuth } from '../hooks/useAuth';
import { TypewriterText } from './TypewriterText';
import { VoiceIndicator } from './VoiceIndicator';
import { SessionSidebar } from './SessionSidebar';
import { GoalSidebar } from './GoalSidebar';
import { StartPage } from './StartPage';

interface ConversationalCoachProps {
  userProfile: UserProfile | null;
}

export const ConversationalCoach: React.FC<ConversationalCoachProps> = ({
  userProfile
}) => {
  const { user } = useAuth();
  
  // Core conversation state
  const [activeConversationMessages, setActiveConversationMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // AI State Machine
  const [aiState, setAiState] = useState<AIState>('COACHING');
  const [goalProposed, setGoalProposed] = useState(false);
  const [userAcceptedGoal, setUserAcceptedGoal] = useState(false);
  
  // UI state
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [currentlyTyping, setCurrentlyTyping] = useState<string | null>(null);
  const [showEndChatButton, setShowEndChatButton] = useState(false);
  
  // Session state
  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [isConversationCompleted, setIsConversationCompleted] = useState(false);
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
  }, [activeConversationMessages]);

  // Handle conversation selection from start page or sidebar
  const handleConversationSelect = async (conversationId: string) => {
    try {
      console.log('Loading conversation:', conversationId);
      
      const conversationMessages = await getConversationMessages(conversationId);
      
      setActiveConversationMessages(conversationMessages);
      setCurrentConversationId(conversationId);
      setHasStartedSession(true);
      
      // Analyze AI state from conversation
      analyzeAIStateFromMessages(conversationMessages);

      // Check if conversation is completed
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      const isCompleted = lastMessage?.role === 'assistant' && 
        (lastMessage.content.includes('Perfect! You\'re all set') || 
         lastMessage.content.includes('Good luck!'));
      setIsConversationCompleted(isCompleted);
      setShowEndChatButton(isCompleted);

      // If loading a completed conversation, add a welcome back message
      if (isCompleted && conversationMessages.length > 0) {
        const welcomeBackMessage: Message = {
          id: `welcome_${Date.now()}`,
          role: 'assistant',
          content: "Welcome back! I can see we had a great conversation here. Shall we continue where we left off, or would you like to explore something new today?",
          timestamp: new Date()
        };
        
        setActiveConversationMessages([...conversationMessages, welcomeBackMessage]);
        setCurrentlyTyping(welcomeBackMessage.id);
        setIsConversationCompleted(false);
        setShowEndChatButton(false);
        setAiState('COACHING');
        
        await saveMessage(conversationId, welcomeBackMessage);
        
        setTimeout(() => {
          setCurrentlyTyping(null);
          if (voiceEnabled && isElevenLabsConfigured) {
            playCoachResponse(welcomeBackMessage.content);
          }
        }, welcomeBackMessage.content.length * 25);
      }
      
      console.log('Conversation loaded successfully with', conversationMessages.length, 'messages');
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const analyzeAIStateFromMessages = (messages: Message[]) => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const userMessages = messages.filter(m => m.role === 'user');
    
    // Check if goal was proposed
    const goalProposedMsg = assistantMessages.find(m => 
      m.content.includes('can I set a small challenge for you')
    );
    
    if (goalProposedMsg) {
      setGoalProposed(true);
      
      // Find user response after goal proposal
      const goalMsgIndex = messages.findIndex(m => m.id === goalProposedMsg.id);
      const userResponseAfterGoal = messages.slice(goalMsgIndex + 1).find(m => m.role === 'user');
      
      if (userResponseAfterGoal) {
        const response = userResponseAfterGoal.content.toLowerCase();
        const accepted = response.includes('yes') || response.includes('okay') || 
                        response.includes('sure') || response.includes('sounds good');
        setUserAcceptedGoal(accepted);
        
        if (accepted) {
          // Check if "anything else" was asked
          const anythingElseMsg = assistantMessages.find(m => 
            m.content.includes('Is there anything else I can help you with')
          );
          
          if (anythingElseMsg) {
            setAiState('AWAITING_GOAL_RESPONSE');
          } else {
            setAiState('AWAITING_GOAL_RESPONSE');
          }
        } else {
          setAiState('AWAITING_GOAL_RESPONSE');
        }
      } else {
        setAiState('AWAITING_GOAL_RESPONSE');
      }
    } else {
      // No goal proposed yet
      if (userMessages.length >= 2) {
        setAiState('PROPOSING_GOAL');
      } else {
        setAiState('COACHING');
      }
    }
  };

  const handleNewConversation = async () => {
    if (!user) return;

    const greeting = userProfile?.name 
      ? `Hi ${userProfile.name}! I'm your AI Coach. ${!isOpenAIConfigured ? '(Demo mode - limited AI features) ' : ''}What would you like to focus on today?`
      : `Hi! I'm your AI Coach. ${!isOpenAIConfigured ? '(Demo mode - limited AI features) ' : ''}What would you like to focus on today?`;
    
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date()
    };

    try {
      const conversationId = await createConversation(user.id, greeting);
      setCurrentConversationId(conversationId);
      
      await saveMessage(conversationId, assistantMessage);
      
      // Reset all state for new conversation
      setActiveConversationMessages([assistantMessage]);
      setCurrentlyTyping(assistantMessage.id);
      setHasStartedSession(true);
      setGoalProposed(false);
      setUserAcceptedGoal(false);
      setIsConversationCompleted(false);
      setShowEndChatButton(false);
      setAiState('COACHING');
      setInputText('');
      resetTranscript();
      
      await updateDailyStreak(user.id);
      
      setTimeout(() => {
        setCurrentlyTyping(null);
        if (voiceEnabled && isElevenLabsConfigured) {
          playCoachResponse(greeting);
        }
      }, greeting.length * 30);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
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

  const detectGoalInMessage = (content: string): boolean => {
    return content.includes('can I set a small challenge for you');
  };

  const sendMessage = async (content: string, isVoice = false) => {
    if (!content.trim() || isLoading || !user || !currentConversationId) return;

    setIsLoading(true);
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      isVoice
    };

    const newMessages = [...activeConversationMessages, userMessage];
    setActiveConversationMessages(newMessages);
    setInputText('');
    resetTranscript();

    try {
      await saveMessage(currentConversationId, userMessage);

      const newContext = analyzeConversationContext(newMessages);
      setContext(newContext);

      // Analyze user response for state transitions
      const userResponse = content.toLowerCase().trim();
      
      // Check if user is indicating they're done (for AWAITING_GOAL_RESPONSE state)
      const isDone = userResponse === 'no' || 
                     userResponse.includes('no thanks') || 
                     userResponse.includes("i'm good") ||
                     userResponse.includes("that's all") ||
                     userResponse.includes('nothing else');

      // Check if user accepted goal
      const acceptedGoal = userResponse.includes('yes') || 
                          userResponse.includes('okay') || 
                          userResponse.includes('sure') || 
                          userResponse.includes('sounds good');

      // Update state based on user response
      if (aiState === 'AWAITING_GOAL_RESPONSE' && acceptedGoal && !userAcceptedGoal) {
        setUserAcceptedGoal(true);
      }

      // Generate AI response using state machine
      const aiResponse = await generateCoachingResponse({
        messages: newMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        context: {
          userName: userProfile?.name,
          previousGoals: userProfile?.longTermGoals,
          currentStage: newContext.growStage,
          aiState,
          goalProposed,
          userAcceptedGoal: userAcceptedGoal || acceptedGoal
        }
      });

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date()
      };

      let finalMessages = [...newMessages, assistantMessage];

      // Handle goal detection and creation
      if (detectGoalInMessage(aiResponse.response) && !goalProposed) {
        setGoalProposed(true);
        setAiState('AWAITING_GOAL_RESPONSE');
        
        // Create goal in database
        try {
          const conversationHistory = newMessages.map(m => `${m.role}: ${m.content}`).join('\n');
          const generatedGoal = await generateGoalFromConversation(conversationHistory);
          
          if (generatedGoal) {
            const goal = {
              id: uuidv4(),
              description: generatedGoal.description,
              xpValue: generatedGoal.xpValue,
              difficulty: generatedGoal.difficulty,
              motivation: 7,
              completed: false,
              createdAt: new Date(),
              deadline: new Date(Date.now() + (generatedGoal.timeframe === '24 hours' ? 86400000 : 
                                             generatedGoal.timeframe === '3 days' ? 259200000 : 604800000))
            };
            
            await saveGoal(user.id, currentConversationId, goal);
          }
        } catch (error) {
          console.error('Error creating goal:', error);
        }
      } else {
        // Update AI state based on response
        setAiState(aiResponse.aiState);
        setShowEndChatButton(aiResponse.shouldShowEndChat);
        
        if (aiResponse.shouldShowEndChat) {
          setIsConversationCompleted(true);
          await updateConversation(currentConversationId, { completed: true });
        }
      }

      setActiveConversationMessages(finalMessages);
      setCurrentlyTyping(assistantMessage.id);

      await saveMessage(currentConversationId, assistantMessage);

      setTimeout(async () => {
        setCurrentlyTyping(null);
        if (voiceEnabled && isElevenLabsConfigured) {
          await playCoachResponse(aiResponse.response);
        }
      }, aiResponse.response.length * 25);

    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Could you try again?",
        timestamp: new Date()
      };
      setActiveConversationMessages([...newMessages, errorMessage]);
      
      if (currentConversationId) {
        await saveMessage(currentConversationId, errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndChat = async () => {
    if (currentConversationId) {
      await updateConversation(currentConversationId, { completed: true });
    }
    
    // Reset to start page
    setHasStartedSession(false);
    setActiveConversationMessages([]);
    setCurrentConversationId(null);
    setAiState('COACHING');
    setGoalProposed(false);
    setUserAcceptedGoal(false);
    setIsConversationCompleted(false);
    setShowEndChatButton(false);
    setInputText('');
    resetTranscript();
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

  // Show start page if no session has started
  if (!hasStartedSession) {
    return (
      <StartPage 
        userProfile={userProfile}
        onStartNewConversation={handleNewConversation}
        onSelectConversation={handleConversationSelect}
      />
    );
  }

  return (
    <div className="flex h-full relative">
      <SessionSidebar 
        isOpen={leftSidebarOpen}
        onClose={() => setLeftSidebarOpen(false)}
        currentConversationId={currentConversationId}
        userProfile={userProfile}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
      />

      <GoalSidebar 
        isOpen={rightSidebarOpen}
        onClose={() => setRightSidebarOpen(false)}
        currentSession={currentConversationId ? { 
          id: currentConversationId, 
          messages: activeConversationMessages, 
          goals: [], 
          insights: [], 
          actions: [], 
          completed: isConversationCompleted, 
          date: new Date() 
        } : null}
        context={context}
        userProfile={userProfile}
      />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto relative">
        <div className="bg-gradient-to-r from-slate-800/90 to-purple-800/90 backdrop-blur-sm border-b border-purple-500/20 p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 animate-pulse"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-all duration-300 group"
                title="Toggle conversation history"
              >
                <Clock className="w-5 h-5 text-purple-300 group-hover:text-white" />
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

            {userProfile && (
              <div className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                <span className="text-orange-300 font-medium text-sm">{userProfile.dailyStreak || 0}</span>
                <span className="text-orange-200 text-xs">day streak</span>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              {showEndChatButton && (
                <button
                  onClick={handleEndChat}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-300 rounded-full border border-green-500/30 hover:bg-green-500/30 transition-all duration-300"
                  title="End conversation"
                >
                  <X className="w-4 h-4" />
                  <span className="text-sm font-medium">End Chat</span>
                </button>
              )}

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
                onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-all duration-300 group"
                title="Toggle goal tracking"
              >
                <Target className="w-5 h-5 text-purple-300 group-hover:text-white" />
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
          {activeConversationMessages.map((message, index) => (
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
                disabled={isLoading || isListening || isConversationCompleted}
              />
              
              {speechSupported && !isConversationCompleted && (
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
              disabled={!inputText.trim() || isLoading || isConversationCompleted}
              className={`p-4 rounded-2xl font-medium transition-all duration-300 transform ${
                inputText.trim() && !isLoading && !isConversationCompleted
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

          {isConversationCompleted && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500/10 text-green-300 rounded-full border border-green-500/20 backdrop-blur-sm">
                <span className="text-sm font-medium">Conversation completed! Use "End Chat" to finish or continue talking.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
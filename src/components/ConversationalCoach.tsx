import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Mic, MicOff, Volume2, VolumeX, Send, Loader, Clock, Target, X, CheckCircle, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ConversationContext, UserProfile } from '../types/coaching';
import { generateCoachingResponse, generateGoalFromConversation, isOpenAIConfigured, AIState } from '../services/openai';
import { generateSpeech, playAudioSynchronized, isElevenLabsConfigured, determineEmotion } from '../services/elevenlabs';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { createConversation, getConversationMessages, saveMessage, updateConversation, saveGoal, updateDailyStreak } from '../services/database';
import { useAuth } from '../hooks/useAuth';
import { useGoals } from '../hooks/useGoals';
import { TypewriterText } from './TypewriterText';
import { VoiceIndicator } from './VoiceIndicator';
import { SessionSidebar } from './SessionSidebar';
import { GoalSidebar } from './GoalSidebar';
import { StartPage } from './StartPage';

interface ConversationalCoachProps {
  userProfile: UserProfile | null;
  onProfileUpdate: (profile: UserProfile) => void;
}

interface PendingGoal {
  id: string;
  description: string;
  messageId: string;
}

export const ConversationalCoach: React.FC<ConversationalCoachProps> = ({
  userProfile,
  onProfileUpdate
}) => {
  const { user } = useAuth();
  const { addGoal, goals, loadGoals } = useGoals();
  
  // Core conversation state
  const [activeConversationMessages, setActiveConversationMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // CRITICAL: Enhanced AI State Machine with structured coaching cycle
  const [aiState, setAiState] = useState<AIState>('COACHING_Q1');
  const [goalProposed, setGoalProposed] = useState(false);
  const [userAcceptedGoal, setUserAcceptedGoal] = useState(false);
  const [userDeclinedGoal, setUserDeclinedGoal] = useState(false);
  const [goalCount, setGoalCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [pendingGoal, setPendingGoal] = useState<PendingGoal | null>(null);
  
  // UI state
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentlyTyping, setCurrentlyTyping] = useState<string | null>(null);
  
  // ENHANCED: Voice synchronization state
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [typingProgress, setTypingProgress] = useState(0);
  const [isVoiceSynced, setIsVoiceSynced] = useState(false);
  const [voiceStartTime, setVoiceStartTime] = useState<number | null>(null);
  
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
  const voiceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // ENHANCED: Force reload goals from database on session start for cross-device sync
  useEffect(() => {
    if (user && hasStartedSession) {
      console.log('🔄 Session started - forcing goal reload for cross-device sync');
      loadGoals(); // This will fetch from database and sync across devices
      
      const currentGoalCount = goals.length;
      setGoalCount(currentGoalCount);
      console.log('🎯 Cross-device goal count updated:', currentGoalCount);
    }
  }, [user, hasStartedSession]);

  // ENHANCED: Real-time goal count updates from database with cross-device sync
  useEffect(() => {
    if (user && hasStartedSession) {
      const currentGoalCount = goals.length;
      setGoalCount(currentGoalCount);
      console.log('🎯 Real-time goal count updated for cross-device sync:', currentGoalCount);
    }
  }, [goals, user, hasStartedSession]);

  // Handle conversation selection from start page or sidebar
  const handleConversationSelect = async (conversationId: string) => {
    try {
      console.log('Loading conversation with cross-device sync:', conversationId);
      
      const conversationMessages = await getConversationMessages(conversationId);
      
      setActiveConversationMessages(conversationMessages);
      setCurrentConversationId(conversationId);
      setHasStartedSession(true);
      
      // ENHANCED: Force reload goals for cross-device sync when switching conversations
      console.log('🔄 Conversation loaded - forcing goal reload for cross-device sync');
      await loadGoals();
      
      // Analyze AI state from conversation
      analyzeAIStateFromMessages(conversationMessages);

      // Check if conversation is completed
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      const isCompleted = lastMessage?.role === 'assistant' && 
        (lastMessage.content.includes('Perfect! You\'re all set') || 
         lastMessage.content.includes('Good luck!'));
      setIsConversationCompleted(isCompleted);

      // If loading a completed conversation, add a welcome back message
      if (isCompleted && conversationMessages.length > 0) {
        const welcomeBackMessage: Message = {
          id: `welcome_${Date.now()}`,
          role: 'assistant',
          content: "Welcome back! I can see we had a great conversation here. What new challenge would you like to work on today?",
          timestamp: new Date()
        };
        
        setActiveConversationMessages([...conversationMessages, welcomeBackMessage]);
        setCurrentlyTyping(welcomeBackMessage.id);
        setIsConversationCompleted(false);
        setAiState('COACHING_Q1');
        
        await saveMessage(conversationId, welcomeBackMessage);
        
        setTimeout(() => {
          setCurrentlyTyping(null);
          if (voiceEnabled && isElevenLabsConfigured) {
            playCoachResponseWithSync(welcomeBackMessage.content);
          }
        }, welcomeBackMessage.content.length * 25);
      }
      
      console.log('Conversation loaded successfully with cross-device sync:', conversationMessages.length, 'messages');
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const analyzeAIStateFromMessages = (messages: Message[]) => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const userMessages = messages.filter(m => m.role === 'user');
    
    // Count goals created in this conversation
    const goalsCreated = assistantMessages.filter(m => m.content.includes('[GOAL]')).length;
    setGoalCount(goalsCreated);
    
    // Count coaching questions (not including goal propositions)
    const coachingQuestions = assistantMessages.filter(m => 
      !m.content.includes('[GOAL]') && 
      !m.content.includes('Is there anything else I can help you with') &&
      m.content.includes('?')
    ).length;
    setQuestionCount(coachingQuestions);
    
    // Check if goal was proposed
    const goalProposedMsg = assistantMessages.find(m => m.content.includes('[GOAL]'));
    
    if (goalProposedMsg) {
      setGoalProposed(true);
      
      // Find user response after goal proposal
      const goalMsgIndex = messages.findIndex(m => m.id === goalProposedMsg.id);
      const userResponseAfterGoal = messages.slice(goalMsgIndex + 1).find(m => m.role === 'user');
      
      if (userResponseAfterGoal) {
        const response = userResponseAfterGoal.content.toLowerCase();
        const accepted = response.includes('accept') || response.includes('yes') || 
                        response.includes('okay') || response.includes('sure') ||
                        response.includes('sounds good') || response.includes('that works');
        const declined = response.includes('decline') || response.includes('no') ||
                        response.includes('not interested') || response.includes('skip');
        
        setUserAcceptedGoal(accepted);
        setUserDeclinedGoal(declined);
        
        if (accepted || declined) {
          // After goal response, determine next state
          if (goalsCreated >= 3) {
            setAiState('ASKING_TO_CONCLUDE');
          } else {
            setAiState('COACHING_Q1'); // Start new cycle
          }
        } else {
          setAiState('AWAITING_GOAL_RESPONSE');
        }
      } else {
        setAiState('AWAITING_GOAL_RESPONSE');
      }
    } else {
      // Determine coaching state based on question count
      if (coachingQuestions >= 3) {
        setAiState('PROPOSING_GOAL');
      } else if (coachingQuestions === 0) {
        setAiState('COACHING_Q1');
      } else if (coachingQuestions === 1) {
        setAiState('COACHING_Q2');
      } else if (coachingQuestions === 2) {
        setAiState('COACHING_Q3');
      } else {
        setAiState('COACHING_Q1');
      }
    }
  };

  const handleNewConversation = async () => {
    if (!user) return;

    const greeting = userProfile?.name 
      ? `Hi ${userProfile.name}! I'm your AI Coach. ${!isOpenAIConfigured ? '(Demo mode - limited AI features) ' : ''}What challenge or goal would you like to work on today?`
      : `Hi! I'm your AI Coach. ${!isOpenAIConfigured ? '(Demo mode - limited AI features) ' : ''}What challenge or goal would you like to work on today?`;
    
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
      setUserDeclinedGoal(false);
      setGoalCount(0);
      setQuestionCount(0);
      setPendingGoal(null);
      setIsConversationCompleted(false);
      setAiState('COACHING_Q1');
      setInputText('');
      resetTranscript();
      
      await updateDailyStreak(user.id);
      
      // ENHANCED: Force reload goals for cross-device sync when starting new conversation
      console.log('🔄 New conversation started - forcing goal reload for cross-device sync');
      await loadGoals();
      
      setTimeout(() => {
        setCurrentlyTyping(null);
        if (voiceEnabled && isElevenLabsConfigured) {
          playCoachResponseWithSync(greeting);
        }
      }, greeting.length * 30);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  // ENHANCED: Voice playback with character, emotion, and perfect synchronization
  const playCoachResponseWithSync = async (text: string) => {
    if (!userProfile?.preferences.voiceEnabled || !isElevenLabsConfigured) return;
    
    try {
      setIsPlayingAudio(true);
      setIsVoiceSynced(true);
      setVoiceProgress(0);
      setTypingProgress(0);
      setVoiceStartTime(Date.now());
      
      // Determine emotion from content
      const emotion = determineEmotion(text);
      
      const audioBuffer = await generateSpeech(text, {
        voiceId: userProfile.preferences.voiceId
      }, emotion);
      
      // ENHANCED: Play audio with perfect progress tracking for synchronization
      await playAudioSynchronized(audioBuffer, text.length, (progress) => {
        setVoiceProgress(progress);
        
        // Clear any existing timeout
        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
        }
        
        // Set timeout to clear voice sync state if audio stops unexpectedly
        voiceTimeoutRef.current = setTimeout(() => {
          if (progress >= 0.95) { // Near completion
            setIsVoiceSynced(false);
            setVoiceProgress(0);
            setTypingProgress(0);
          }
        }, 100);
      });
      
    } catch (error) {
      console.error('Error playing synchronized audio:', error);
    } finally {
      setIsPlayingAudio(false);
      setIsVoiceSynced(false);
      setVoiceProgress(0);
      setTypingProgress(0);
      setVoiceStartTime(null);
      
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
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

  // CRITICAL: Enhanced goal detection and handling
  const detectGoalInMessage = (content: string): boolean => {
    return content.includes('[GOAL]');
  };

  const extractGoalFromMessage = (content: string): string => {
    // Extract goal description after "[GOAL]" tag and "Can I suggest a challenge based on our conversation?"
    const goalMatch = content.match(/\[GOAL\].*?Can I suggest a challenge based on our conversation\?\s*(.+)/);
    return goalMatch ? goalMatch[1].trim() : content.replace('[GOAL]', '').trim();
  };

  // CRITICAL: Handle goal acceptance/decline with UI buttons and real-time updates
  const handleGoalResponse = async (accepted: boolean) => {
    if (!pendingGoal || !currentConversationId || !user) return;

    const responseText = accepted ? 'Accept' : 'Decline';
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: responseText,
      timestamp: new Date()
    };

    const newMessages = [...activeConversationMessages, userMessage];
    setActiveConversationMessages(newMessages);

    try {
      await saveMessage(currentConversationId, userMessage);

      if (accepted) {
        // CRITICAL: Create goal in database when accepted with cross-device sync
        const conversationHistory = newMessages.map(m => `${m.role}: ${m.content}`).join('\n');
        const generatedGoal = await generateGoalFromConversation(conversationHistory);
        
        if (generatedGoal) {
          // Calculate deadline based on timeframe
          let deadline = new Date();
          switch (generatedGoal.timeframe) {
            case '24 hours':
              deadline.setHours(deadline.getHours() + 24);
              break;
            case '3 days':
              deadline.setDate(deadline.getDate() + 3);
              break;
            case '1 week':
              deadline.setDate(deadline.getDate() + 7);
              break;
            default:
              deadline.setDate(deadline.getDate() + 3); // Default to 3 days
          }

          const goal = {
            id: uuidv4(),
            description: pendingGoal.description,
            xpValue: generatedGoal.xpValue,
            difficulty: generatedGoal.difficulty,
            motivation: 7,
            completed: false,
            createdAt: new Date(),
            deadline: deadline
          };
          
          // ENHANCED: Save goal using the goals hook - this will trigger real-time updates and cross-device sync
          await addGoal(goal, currentConversationId);
          console.log(`✅ Goal accepted and created with cross-device sync:`, goal.description);
          
          // CRITICAL: Real-time goal count update with cross-device sync
          const newGoalCount = goals.length + 1; // Immediate update before hook refresh
          setGoalCount(newGoalCount);
          setUserAcceptedGoal(true);
          setUserDeclinedGoal(false);
          
          // ENHANCED: Force refresh of goals to ensure cross-device sync
          setTimeout(() => {
            loadGoals();
          }, 100);
        }
      } else {
        setUserDeclinedGoal(true);
        setUserAcceptedGoal(false);
      }

      // Clear pending goal
      setPendingGoal(null);

      // Generate AI response with goal memory and cross-device sync
      const activeGoals = goals.filter(g => !g.completed).length;
      const completedGoals = goals.filter(g => g.completed).length;
      
      const contextForAI = {
        userName: userProfile?.name,
        previousGoals: userProfile?.longTermGoals,
        currentStage: context.growStage,
        aiState,
        goalProposed: true,
        userAcceptedGoal: accepted,
        userDeclinedGoal: !accepted,
        messageCount: newMessages.length,
        goalCount: accepted ? goalCount + 1 : goalCount,
        questionCount,
        activeGoals: accepted ? activeGoals + 1 : activeGoals,
        completedGoals
      };

      const aiResponse = await generateCoachingResponse({
        messages: newMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        context: contextForAI
      });

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date()
      };

      const finalMessages = [...newMessages, assistantMessage];
      setActiveConversationMessages(finalMessages);
      setCurrentlyTyping(assistantMessage.id);
      setAiState(aiResponse.aiState);

      await saveMessage(currentConversationId, assistantMessage);

      // Handle End Chat button visibility
      if (aiResponse.shouldShowEndChat) {
        setIsConversationCompleted(true);
        await updateConversation(currentConversationId, { completed: true });
      }

      setTimeout(async () => {
        setCurrentlyTyping(null);
        if (voiceEnabled && isElevenLabsConfigured) {
          await playCoachResponseWithSync(aiResponse.response);
        }
      }, aiResponse.response.length * 25);

    } catch (error) {
      console.error('Error handling goal response:', error);
    }
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

      // CRITICAL: Enhanced context for AI with goal memory and cross-device sync
      const activeGoals = goals.filter(g => !g.completed).length;
      const completedGoals = goals.filter(g => g.completed).length;
      
      let contextForAI = {
        userName: userProfile?.name,
        previousGoals: userProfile?.longTermGoals,
        currentStage: newContext.growStage,
        aiState,
        goalProposed,
        userAcceptedGoal,
        userDeclinedGoal,
        messageCount: newMessages.length,
        goalCount,
        questionCount,
        activeGoals,
        completedGoals
      };

      // Generate AI response using enhanced state machine
      const aiResponse = await generateCoachingResponse({
        messages: newMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        context: contextForAI
      });

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date()
      };

      let finalMessages = [...newMessages, assistantMessage];

      // CRITICAL: Handle goal proposition with pending state
      if (detectGoalInMessage(aiResponse.response)) {
        console.log('🎯 GOAL DETECTED: Setting up pending goal for user response');
        setGoalProposed(true);
        
        const goalDescription = extractGoalFromMessage(aiResponse.response);
        setPendingGoal({
          id: uuidv4(),
          description: goalDescription,
          messageId: assistantMessage.id
        });
        
        // Increment question count when proposing goal
        setQuestionCount(prev => prev + 1);
      } else if (aiState.startsWith('COACHING_')) {
        // Increment question count for coaching questions
        setQuestionCount(prev => prev + 1);
      }

      // Update AI state
      setAiState(aiResponse.aiState);
      
      // Handle End Chat button visibility
      if (aiResponse.shouldShowEndChat) {
        setIsConversationCompleted(true);
        await updateConversation(currentConversationId, { completed: true });
      }

      setActiveConversationMessages(finalMessages);
      setCurrentlyTyping(assistantMessage.id);

      await saveMessage(currentConversationId, assistantMessage);

      setTimeout(async () => {
        setCurrentlyTyping(null);
        if (voiceEnabled && isElevenLabsConfigured) {
          await playCoachResponseWithSync(aiResponse.response.replace('[GOAL]', ''));
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
    setAiState('COACHING_Q1');
    setGoalProposed(false);
    setUserAcceptedGoal(false);
    setUserDeclinedGoal(false);
    setGoalCount(0);
    setQuestionCount(0);
    setPendingGoal(null);
    setIsConversationCompleted(false);
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
      {/* ENHANCED: Show sidebars on all screen sizes but make them controllable */}
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
        userProfile={userProfile}
      />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto relative">
        <div className="bg-gradient-to-r from-slate-800/90 to-purple-800/90 backdrop-blur-sm border-b border-purple-500/20 p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 animate-pulse"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* ENHANCED: Show sidebar toggles on all screen sizes */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                  className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-all duration-300 group"
                  title="Toggle conversation history"
                >
                  <Clock className="w-5 h-5 text-purple-300 group-hover:text-white" />
                </button>
              </div>
              
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
                    {stageInfo.icon} {stageInfo.label} • Q{questionCount}/3 • {goalCount} goals
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
              {/* CRITICAL: Always visible End Chat Button in red */}
              <button
                onClick={handleEndChat}
                className="flex items-center space-x-2 px-4 py-2 rounded-full border font-medium transition-all duration-300 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
                title="End current conversation"
              >
                <X className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">End Chat</span>
              </button>

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
              
              {/* ENHANCED: Show goal sidebar toggle on all screen sizes */}
              <div>
                <button
                  onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                  className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-all duration-300 group"
                  title="Toggle goal tracking"
                >
                  <Target className="w-5 h-5 text-purple-300 group-hover:text-white" />
                </button>
              </div>
              
              {/* ENHANCED: Mobile-friendly voice indicator */}
              {isPlayingAudio && (
                <div className="hidden sm:block">
                  <VoiceIndicator />
                </div>
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
            <div key={message.id}>
              <div
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
                    <TypewriterText 
                      text={message.content.replace('[GOAL]', '')} 
                      speed={25}
                      enableVoiceSync={isVoiceSynced}
                      onProgress={(progress) => setTypingProgress(progress)}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">
                      {/* CRITICAL: Remove [GOAL] tag from display but keep original content for processing */}
                      {message.content.replace('[GOAL]', '')}
                    </p>
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

              {/* CRITICAL: Goal Accept/Decline Buttons */}
              {pendingGoal && pendingGoal.messageId === message.id && (
                <div className="flex justify-start mt-4 animate-fade-in">
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20 backdrop-blur-sm">
                    <p className="text-white text-sm mb-3 font-medium">Would you like to accept this challenge?</p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleGoalResponse(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleGoalResponse(false)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                disabled={isLoading || isListening || isConversationCompleted || !!pendingGoal}
              />
              
              {speechSupported && !isConversationCompleted && !pendingGoal && (
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
              disabled={!inputText.trim() || isLoading || isConversationCompleted || !!pendingGoal}
              className={`p-4 rounded-2xl font-medium transition-all duration-300 transform ${
                inputText.trim() && !isLoading && !isConversationCompleted && !pendingGoal
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

          {pendingGoal && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500/10 text-blue-300 rounded-full border border-blue-500/20 backdrop-blur-sm">
                <span className="text-sm font-medium">Please respond to the goal above before continuing</span>
              </div>
            </div>
          )}

          {/* ENHANCED: Mobile-friendly voice synchronization indicator */}
          {isVoiceSynced && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-3 px-4 py-2 bg-purple-500/10 text-purple-300 rounded-full border border-purple-500/20 backdrop-blur-sm max-w-xs mx-auto">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium hidden sm:inline">Voice synchronized</span>
                  <span className="text-sm font-medium sm:hidden">🎤 Speaking</span>
                </div>
                <div className="w-16 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
                    style={{ width: `${Math.max(voiceProgress, typingProgress) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {isConversationCompleted && goalCount >= 2 && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500/10 text-green-300 rounded-full border border-green-500/20 backdrop-blur-sm">
                <span className="text-sm font-medium">Great session! You created {goalCount} actionable goals. Use "End Chat" to finish or continue exploring.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
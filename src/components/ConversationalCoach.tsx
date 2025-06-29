import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Mic, MicOff, Volume2, VolumeX, Send, Loader, Menu, Sidebar, RotateCcw, Clock, Target, X, CheckCircle, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ConversationContext, UserProfile } from '../types/coaching';
import { generateCoachingResponse, generateGoalFromConversation, isOpenAIConfigured, AIState } from '../services/openai';
import { generateSpeech, playAudio, isElevenLabsConfigured } from '../services/elevenlabs';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { createConversation, getConversationMessages, saveMessage, updateConversation, updateDailyStreak } from '../services/database';
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
  difficulty: 'easy' | 'medium' | 'hard';
  xpValue: number;
  deadline: Date;
}

export const ConversationalCoach: React.FC<ConversationalCoachProps> = ({
  userProfile,
  onProfileUpdate
}) => {
  const { user } = useAuth();
  const { goals, addGoal, completeGoal, loadGoals, getGoalStats } = useGoals();
  
  // Core conversation state
  const [activeConversationMessages, setActiveConversationMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // CRITICAL: Enhanced AI State Machine with structured coaching cycle
  const [aiState, setAiState] = useState<AIState>('COACHING_Q1');
  const [goalProposed, setGoalProposed] = useState(false);
  const [userAcceptedGoal, setUserAcceptedGoal] = useState(false);
  const [userDeclinedGoal, setUserDeclinedGoal] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [pendingGoal, setPendingGoal] = useState<PendingGoal | null>(null);
  
  // UI state
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [currentlyTyping, setCurrentlyTyping] = useState<string | null>(null);
  const [showEndChatButton, setShowEndChatButton] = useState(false);
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [showContinueOptions, setShowContinueOptions] = useState(false);
  
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

  // CRITICAL: Load goals when conversation changes to maintain memory
  useEffect(() => {
    if (currentConversationId && user) {
      loadGoals();
    }
  }, [currentConversationId, user]);

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
        const goalStats = getGoalStats();
        const welcomeBackMessage: Message = {
          id: `welcome_${Date.now()}`,
          role: 'assistant',
          content: `Welcome back! I can see we had a great conversation here. ${goalStats.total > 0 ? `You currently have ${goalStats.pending} active goals and ${goalStats.completed} completed. ` : ''}What new challenge would you like to work on today?`,
          timestamp: new Date()
        };
        
        setActiveConversationMessages([...conversationMessages, welcomeBackMessage]);
        setCurrentlyTyping(welcomeBackMessage.id);
        setIsConversationCompleted(false);
        setShowEndChatButton(false);
        setAiState('COACHING_Q1');
        
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
          const goalStats = getGoalStats();
          if (goalStats.total >= 3) {
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

    const goalStats = getGoalStats();
    const greeting = userProfile?.name 
      ? `Hi ${userProfile.name}! I'm your AI Coach. ${!isOpenAIConfigured ? '(Demo mode - limited AI features) ' : ''}${goalStats.total > 0 ? `I can see you have ${goalStats.pending} active goals and ${goalStats.completed} completed. ` : ''}What challenge or goal would you like to work on today?`
      : `Hi! I'm your AI Coach. ${!isOpenAIConfigured ? '(Demo mode - limited AI features) ' : ''}${goalStats.total > 0 ? `I can see you have ${goalStats.pending} active goals and ${goalStats.completed} completed. ` : ''}What challenge or goal would you like to work on today?`;
    
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
      setQuestionCount(0);
      setPendingGoal(null);
      setIsConversationCompleted(false);
      setShowEndChatButton(false);
      setShowContinueOptions(false);
      setAiState('COACHING_Q1');
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

  // CRITICAL: Enhanced goal detection and handling
  const detectGoalInMessage = (content: string): boolean => {
    return content.includes('[GOAL]');
  };

  const extractGoalFromMessage = (content: string): string => {
    // Extract goal description after "[GOAL]" tag and "Can I suggest a challenge based on our conversation?"
    const goalMatch = content.match(/\[GOAL\].*?Can I suggest a challenge based on our conversation\?\s*(.+)/);
    return goalMatch ? goalMatch[1].trim() : content.replace('[GOAL]', '').trim();
  };

  // CRITICAL: Create goal object with proper structure
  const createGoalFromDescription = (description: string): PendingGoal => {
    // Calculate deadline based on goal complexity
    const deadline = new Date();
    if (description.toLowerCase().includes('today') || description.toLowerCase().includes('now')) {
      deadline.setHours(deadline.getHours() + 24);
    } else if (description.toLowerCase().includes('week')) {
      deadline.setDate(deadline.getDate() + 7);
    } else {
      deadline.setDate(deadline.getDate() + 3); // Default 3 days
    }

    // Determine difficulty based on description
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (description.toLowerCase().includes('research') || description.toLowerCase().includes('write down') || description.toLowerCase().includes('list')) {
      difficulty = 'easy';
    } else if (description.toLowerCase().includes('conversation') || description.toLowerCase().includes('plan') || description.toLowerCase().includes('organize')) {
      difficulty = 'hard';
    }

    // Calculate XP based on difficulty
    const xpValues = { easy: 50, medium: 75, hard: 100 };

    return {
      id: uuidv4(),
      description,
      messageId: '',
      difficulty,
      xpValue: xpValues[difficulty],
      deadline
    };
  };

  // CRITICAL: Handle goal acceptance/decline with proper goal creation and continuation options
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
        // CRITICAL: Create and add goal to global goals system IMMEDIATELY
        const newGoal = {
          id: pendingGoal.id,
          description: pendingGoal.description,
          difficulty: pendingGoal.difficulty,
          xpValue: pendingGoal.xpValue,
          deadline: pendingGoal.deadline,
          completed: false,
          createdAt: new Date(),
          motivation: 7 // Default motivation level
        };
        
        // Add to global goals system immediately for instant visibility
        await addGoal(newGoal, currentConversationId);
        
        console.log(`✅ Goal accepted and added to global goals system:`, newGoal.description);
        
        setUserAcceptedGoal(true);
        setUserDeclinedGoal(false);
        
        // Show continuation options after goal acceptance
        setShowContinueOptions(true);
      } else {
        setUserDeclinedGoal(true);
        setUserAcceptedGoal(false);
      }

      // Clear pending goal
      setPendingGoal(null);

      // Generate AI response with updated goal context
      const goalStats = getGoalStats();
      const contextForAI = {
        userName: userProfile?.name,
        previousGoals: userProfile?.longTermGoals,
        currentStage: context.growStage,
        aiState,
        goalProposed: true,
        userAcceptedGoal: accepted,
        userDeclinedGoal: !accepted,
        messageCount: newMessages.length,
        goalCount: goalStats.total,
        questionCount,
        activeGoals: goalStats.pending,
        completedGoals: goalStats.completed
      };

      const aiResponse = await generateCoachingResponse({
        messages: newMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        context: contextForAI
      });

      // Enhanced response for goal acceptance
      let responseContent = aiResponse.response;
      if (accepted) {
        responseContent = `Perfect! I've added that challenge to your goals. You can track your progress in the goals panel on the right. ${aiResponse.response}`;
      }

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };

      const finalMessages = [...newMessages, assistantMessage];
      setActiveConversationMessages(finalMessages);
      setCurrentlyTyping(assistantMessage.id);
      setAiState(aiResponse.aiState);

      await saveMessage(currentConversationId, assistantMessage);

      // Handle End Chat button visibility
      if (aiResponse.shouldShowEndChat) {
        setShowEndChatButton(true);
        setIsConversationCompleted(true);
        await updateConversation(currentConversationId, { completed: true });
      }

      setTimeout(async () => {
        setCurrentlyTyping(null);
        if (voiceEnabled && isElevenLabsConfigured) {
          await playCoachResponse(responseContent.replace('[GOAL]', ''));
        }
      }, responseContent.length * 25);

    } catch (error) {
      console.error('Error handling goal response:', error);
    }
  };

  // CRITICAL: Handle continuation choice after goal acceptance
  const handleContinueChoice = async (continueConversation: boolean) => {
    setShowContinueOptions(false);
    
    if (continueConversation) {
      // Continue with new coaching cycle
      const goalStats = getGoalStats();
      const continueMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `Great! You now have ${goalStats.pending} active goals to work on. What else would you like to explore?`,
        timestamp: new Date()
      };
      
      setActiveConversationMessages(prev => [...prev, continueMessage]);
      setCurrentlyTyping(continueMessage.id);
      setAiState('COACHING_Q1');
      setQuestionCount(0);
      
      if (currentConversationId) {
        await saveMessage(currentConversationId, continueMessage);
      }
      
      setTimeout(() => {
        setCurrentlyTyping(null);
        if (voiceEnabled && isElevenLabsConfigured) {
          playCoachResponse(continueMessage.content);
        }
      }, continueMessage.content.length * 25);
    } else {
      // End conversation
      handleEndChat();
    }
  };

  // CRITICAL: Goal completion handler with XP rewards
  const handleGoalCompletion = async (goalId: string, reasoning: string) => {
    if (!user || !userProfile) return;

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    try {
      // Calculate XP with time bonus/penalty
      const timeInfo = goal.deadline ? getTimeRemaining(goal.deadline, goal.createdAt) : null;
      let xpMultiplier = 1.0;
      
      if (timeInfo && !timeInfo.isOverdue) {
        // Bonus for completing early
        if (timeInfo.percentage > 75) xpMultiplier = 1.5;
        else if (timeInfo.percentage > 50) xpMultiplier = 1.3;
        else if (timeInfo.percentage > 25) xpMultiplier = 1.1;
      } else if (timeInfo?.isOverdue) {
        // Penalty for being overdue
        xpMultiplier = 0.7;
      }

      const finalXP = Math.round(goal.xpValue * xpMultiplier);
      
      // Complete goal and update profile
      const result = await completeGoal(goalId, reasoning, finalXP, userProfile);
      
      if (result) {
        // Update local profile state
        onProfileUpdate({
          ...userProfile,
          totalXP: result.newXP,
          level: result.newLevel
        });

        // Show XP animation
        setXpGained(finalXP);
        setShowXPAnimation(true);
        setTimeout(() => setShowXPAnimation(false), 3000);
      }
      
      console.log('Goal completed with XP reward:', finalXP);
    } catch (error) {
      console.error('Error completing goal:', error);
    }
  };

  // Helper function for time calculations
  const getTimeRemaining = (deadline: Date, createdAt: Date) => {
    const now = new Date();
    const timeLeft = deadline.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
      return {
        timeLeft: 'Overdue',
        percentage: 0,
        isOverdue: true,
        totalHours: 0,
        remainingHours: 0
      };
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const totalTime = deadline.getTime() - createdAt.getTime();
    const totalHours = Math.floor(totalTime / (1000 * 60 * 60));
    const percentage = totalHours > 0 ? Math.max(0, (timeLeft / totalTime) * 100) : 0;

    return {
      timeLeft: `${hours}h`,
      percentage,
      isOverdue: false,
      totalHours,
      remainingHours: hours
    };
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

      // CRITICAL: Enhanced context for AI with structured coaching cycle and goal memory
      const goalStats = getGoalStats();
      let contextForAI = {
        userName: userProfile?.name,
        previousGoals: userProfile?.longTermGoals,
        currentStage: newContext.growStage,
        aiState,
        goalProposed,
        userAcceptedGoal,
        userDeclinedGoal,
        messageCount: newMessages.length,
        goalCount: goalStats.total,
        questionCount,
        activeGoals: goalStats.pending,
        completedGoals: goalStats.completed
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
        const goalObject = createGoalFromDescription(goalDescription);
        
        setPendingGoal({
          ...goalObject,
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
        setShowEndChatButton(true);
        setIsConversationCompleted(true);
        await updateConversation(currentConversationId, { completed: true });
      }

      setActiveConversationMessages(finalMessages);
      setCurrentlyTyping(assistantMessage.id);

      await saveMessage(currentConversationId, assistantMessage);

      setTimeout(async () => {
        setCurrentlyTyping(null);
        if (voiceEnabled && isElevenLabsConfigured) {
          await playCoachResponse(aiResponse.response.replace('[GOAL]', ''));
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
    setQuestionCount(0);
    setPendingGoal(null);
    setIsConversationCompleted(false);
    setShowEndChatButton(false);
    setShowContinueOptions(false);
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
  const goalStats = getGoalStats();

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
      {/* XP Animation */}
      {showXPAnimation && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-60 pointer-events-none">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold">+{xpGained} XP!</span>
            </div>
          </div>
        </div>
      )}

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
        goals={goals}
        onGoalComplete={handleGoalCompletion}
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
                    {stageInfo.icon} {stageInfo.label} • Q{questionCount}/3 • {goalStats.pending} active goals
                  </p>
                </div>
              </div>
            </div>

            {userProfile && (
              <div className="hidden md:flex items-center space-x-4">
                {/* Level Display */}
                <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
                  <span className="text-yellow-300 font-medium text-sm">Level {userProfile.level || 1}</span>
                  <span className="text-yellow-200 text-xs">{userProfile.totalXP || 0} XP</span>
                </div>
                
                {/* Goals Count */}
                <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                  <span className="text-purple-300 font-medium text-sm">{goalStats.completed}/{goalStats.total}</span>
                  <span className="text-purple-200 text-xs">goals</span>
                </div>
                
                {/* Streak Display */}
                <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                  <span className="text-orange-300 font-medium text-sm">{userProfile.dailyStreak || 0}</span>
                  <span className="text-orange-200 text-xs">day streak</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              {/* CRITICAL: End Chat Button - Only appears after multiple goals */}
              {showEndChatButton && goalStats.pending >= 2 && (
                <button
                  onClick={handleEndChat}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-300 rounded-full border border-green-500/30 hover:bg-green-500/30 transition-all duration-300 animate-fade-in"
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

              {/* CRITICAL: Continue/End Options after goal acceptance */}
              {showContinueOptions && index === activeConversationMessages.length - 1 && (
                <div className="flex justify-start mt-4 animate-fade-in">
                  <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-4 border border-green-500/20 backdrop-blur-sm">
                    <p className="text-white text-sm mb-3 font-medium">Your goal has been added! What would you like to do next?</p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleContinueChoice(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Continue Coaching</span>
                      </button>
                      <button
                        onClick={() => handleContinueChoice(false)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                      >
                        <X className="w-4 h-4" />
                        <span>End Session</span>
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
                disabled={isLoading || isListening || isConversationCompleted || !!pendingGoal || showContinueOptions}
              />
              
              {speechSupported && !isConversationCompleted && !pendingGoal && !showContinueOptions && (
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
              disabled={!inputText.trim() || isLoading || isConversationCompleted || !!pendingGoal || showContinueOptions}
              className={`p-4 rounded-2xl font-medium transition-all duration-300 transform ${
                inputText.trim() && !isLoading && !isConversationCompleted && !pendingGoal && !showContinueOptions
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

          {showContinueOptions && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500/10 text-green-300 rounded-full border border-green-500/20 backdrop-blur-sm">
                <span className="text-sm font-medium">Choose your next step above to continue</span>
              </div>
            </div>
          )}

          {isConversationCompleted && goalStats.pending >= 2 && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500/10 text-green-300 rounded-full border border-green-500/20 backdrop-blur-sm">
                <span className="text-sm font-medium">Great session! You created {goalStats.pending} actionable goals. Use "End Chat" to finish or continue exploring.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
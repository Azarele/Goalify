import React, { useState, useEffect } from 'react';
import { X, Calendar, MessageCircle, Clock, Search, Filter, ArrowRight, Plus, Brain, Target, Lightbulb, Heart, Briefcase, Dumbbell, MoreVertical, Trash2, XCircle } from 'lucide-react';
import { UserProfile } from '../types/coaching';
import { getUserConversations, updateConversation, deleteConversation } from '../services/database';
import { useAuth } from '../hooks/useAuth';
import { generateConversationLabel } from '../services/openai';

interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  completed: boolean;
  aiLabel?: string;
  category?: string;
}

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentConversationId: string | null;
  userProfile: UserProfile | null;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  conversationId: string | null;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  isOpen,
  onClose,
  currentConversationId,
  userProfile,
  onConversationSelect,
  onNewConversation
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelingConversations, setLabelingConversations] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    conversationId: null
  });
  
  useEffect(() => {
    loadConversations();
  }, [user]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ isOpen: false, x: 0, y: 0, conversationId: null });
    };

    if (contextMenu.isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.isOpen]);

  const loadConversations = async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      const conversationsData = await getUserConversations(user.id);
      
      // Convert to our format and add AI labels
      const conversationsWithLabels = await Promise.all(
        conversationsData.map(async (conv) => {
          const conversation: Conversation = {
            ...conv,
            aiLabel: conv.aiLabel || conv.title, // Use existing AI label or fallback to title
            category: conv.category || 'general'
          };

          // Generate AI label if conversation doesn't have one and has enough content
          if (!conv.aiLabel && conv.title.length > 20 && !conv.title.includes('Hi! I\'m your AI Coach')) {
            try {
              setLabelingConversations(prev => new Set(prev).add(conv.id));
              const aiLabel = await generateConversationLabel(conv.title);
              if (aiLabel && aiLabel.label !== conv.title) {
                conversation.aiLabel = aiLabel.label;
                conversation.category = aiLabel.category;
                
                // Update the conversation in the database with the AI label
                await updateConversation(conv.id, {
                  aiLabel: aiLabel.label,
                  category: aiLabel.category
                });
              }
            } catch (error) {
              console.error('Error generating AI label for conversation:', conv.id, error);
            } finally {
              setLabelingConversations(prev => {
                const newSet = new Set(prev);
                newSet.delete(conv.id);
                return newSet;
              });
            }
          }

          return conversation;
        })
      );

      setConversations(conversationsWithLabels);
      console.log('Loaded conversations with AI labels:', conversationsWithLabels.length);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getConversationsByPeriod = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    let filteredConversations = conversations;

    // Apply search filter
    if (searchTerm) {
      filteredConversations = filteredConversations.filter(conversation => 
        conversation.aiLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conversation.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply period filter
    if (filterPeriod !== 'all') {
      switch (filterPeriod) {
        case 'today':
          filteredConversations = filteredConversations.filter(c => c.updated_at >= today);
          break;
        case 'week':
          filteredConversations = filteredConversations.filter(c => c.updated_at >= weekAgo);
          break;
        case 'month':
          filteredConversations = filteredConversations.filter(c => c.updated_at >= monthAgo);
          break;
      }
    }

    return {
      today: filteredConversations.filter(c => c.updated_at >= today),
      thisWeek: filteredConversations.filter(c => c.updated_at >= weekAgo && c.updated_at < today),
      thisMonth: filteredConversations.filter(c => c.updated_at >= monthAgo && c.updated_at < weekAgo),
      older: filteredConversations.filter(c => c.updated_at < monthAgo)
    };
  };

  const conversationGroups = getConversationsByPeriod();

  const handleConversationClick = async (conversation: Conversation) => {
    console.log('Conversation clicked:', conversation.id, conversation.aiLabel || conversation.title);
    
    await onConversationSelect(conversation.id);
    
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleNewConversation = () => {
    console.log('Starting new conversation');
    onNewConversation();
    
    // Close sidebar on mobile after starting new conversation
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleMenuClick = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({
      isOpen: true,
      x: rect.left - 160, // Position to the left of the button
      y: rect.bottom + 5,
      conversationId
    });
  };

  const handleCloseChat = async (conversationId: string) => {
    try {
      await updateConversation(conversationId, { completed: true });
      
      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, completed: true }
            : conv
        )
      );
      
      console.log('Chat closed:', conversationId);
    } catch (error) {
      console.error('Error closing chat:', error);
    }
    
    setContextMenu({ isOpen: false, x: 0, y: 0, conversationId: null });
  };

  const handleDeleteChat = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      console.log('Chat deleted:', conversationId);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
    
    setContextMenu({ isOpen: false, x: 0, y: 0, conversationId: null });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'career': return <Briefcase className="w-3 h-3" />;
      case 'health': return <Dumbbell className="w-3 h-3" />;
      case 'relationships': return <Heart className="w-3 h-3" />;
      case 'productivity': return <Target className="w-3 h-3" />;
      case 'personal': return <Brain className="w-3 h-3" />;
      case 'goals': return <Target className="w-3 h-3" />;
      default: return <Lightbulb className="w-3 h-3" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'career': return 'text-blue-400 bg-blue-500/20';
      case 'health': return 'text-green-400 bg-green-500/20';
      case 'relationships': return 'text-pink-400 bg-pink-500/20';
      case 'productivity': return 'text-orange-400 bg-orange-500/20';
      case 'personal': return 'text-purple-400 bg-purple-500/20';
      case 'goals': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const ConversationGroup = ({ title, conversations, icon }: { title: string; conversations: Conversation[]; icon: React.ReactNode }) => {
    if (conversations.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          {icon}
          <h4 className="font-medium text-purple-200 text-sm">{title}</h4>
          <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full">
            {conversations.length}
          </span>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
          {conversations.map((conversation) => {
            const isLabeling = labelingConversations.has(conversation.id);
            
            return (
              <div 
                key={conversation.id}
                className={`p-3 rounded-lg transition-all duration-300 border group hover:scale-[1.02] relative ${
                  isLabeling 
                    ? 'bg-slate-700/20 border-slate-600/20 cursor-wait opacity-75'
                    : currentConversationId === conversation.id
                      ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/50 shadow-lg ring-2 ring-purple-400/30 cursor-pointer'
                      : 'bg-slate-700/30 hover:bg-slate-600/40 border-slate-600/30 hover:border-purple-500/30 cursor-pointer'
                }`}
              >
                <div 
                  onClick={() => !isLabeling && handleConversationClick(conversation)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2 flex-1 mr-2">
                    {/* Category Icon */}
                    <div className={`p-1 rounded ${getCategoryColor(conversation.category || 'general')}`}>
                      {getCategoryIcon(conversation.category || 'general')}
                    </div>
                    
                    {/* Conversation Title/Label */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium line-clamp-2 transition-colors ${
                        isLabeling 
                          ? 'text-purple-400'
                          : 'text-white group-hover:text-purple-200'
                      }`}>
                        {isLabeling ? (
                          <span className="flex items-center space-x-2">
                            <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Analyzing conversation...</span>
                          </span>
                        ) : (
                          conversation.aiLabel || conversation.title
                        )}
                      </span>
                      
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-purple-400">
                          {conversation.updated_at.toLocaleDateString()}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-purple-300">
                            {conversation.updated_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!isLabeling && (
                            <ArrowRight className={`w-3 h-3 text-purple-400 transition-all duration-200 ${
                              currentConversationId === conversation.id ? 'opacity-100 translate-x-1' : 'opacity-0 group-hover:opacity-100'
                            }`} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Three dots menu */}
                {!isLabeling && (
                  <button
                    onClick={(e) => handleMenuClick(e, conversation.id)}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-purple-500/20 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4 text-purple-400" />
                  </button>
                )}
                
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    conversation.completed 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }`}>
                    {conversation.completed ? 'Complete' : 'In Progress'}
                  </span>
                  {currentConversationId === conversation.id && (
                    <span className="text-xs text-purple-300 font-medium">Active</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <div
          className="fixed z-50 bg-slate-800 border border-purple-500/30 rounded-lg shadow-xl py-2 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => contextMenu.conversationId && handleCloseChat(contextMenu.conversationId)}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-purple-500/20 transition-colors flex items-center space-x-2"
          >
            <XCircle className="w-4 h-4 text-orange-400" />
            <span>Close Chat</span>
          </button>
          <button
            onClick={() => contextMenu.conversationId && handleDeleteChat(contextMenu.conversationId)}
            className="w-full px-4 py-2 text-left text-sm text-red-300 hover:bg-red-500/20 transition-colors flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Delete Chat</span>
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative top-0 left-0 h-full w-80 bg-gradient-to-b from-slate-800 to-purple-900 border-r border-purple-500/20 z-50
        transform transition-transform duration-300 ease-in-out backdrop-blur-sm
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isOpen ? 'lg:block' : 'lg:hidden'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-purple-500/20 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">📜 Conversation History</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <X className="w-5 h-5 text-purple-300" />
              </button>
            </div>

            {/* New Conversation Button */}
            <button
              onClick={handleNewConversation}
              className="w-full mb-4 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2 mb-3">
              <Filter className="w-4 h-4 text-purple-400" />
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="flex-1 py-2 px-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div className="text-sm text-purple-300">
              {conversations.length} total conversations
              {labelingConversations.size > 0 && (
                <span className="block text-xs text-blue-300 mt-1">
                  🤖 AI is analyzing {labelingConversations.size} conversation{labelingConversations.size > 1 ? 's' : ''}...
                </span>
              )}
            </div>
            
            <div className="text-xs text-purple-400 mt-2">
              💡 Click the three dots for options
            </div>
          </div>

          {/* ENHANCED: Conversations List with Individual Scrolling */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent min-h-0">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-purple-300">Loading conversations...</p>
              </div>
            ) : conversations.length > 0 ? (
              <>
                <ConversationGroup 
                  title="Today's Conversations" 
                  conversations={conversationGroups.today}
                  icon={<Clock className="w-4 h-4 text-green-400" />}
                />
                <ConversationGroup 
                  title="Past Week" 
                  conversations={conversationGroups.thisWeek}
                  icon={<Calendar className="w-4 h-4 text-blue-400" />}
                />
                <ConversationGroup 
                  title="Past Month" 
                  conversations={conversationGroups.thisMonth}
                  icon={<Calendar className="w-4 h-4 text-purple-400" />}
                />
                <ConversationGroup 
                  title="Older" 
                  conversations={conversationGroups.older}
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                />
              </>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-white mb-2">No conversations yet</h3>
                <p className="text-purple-300 text-sm mb-4">
                  Start your first coaching conversation to see your history here!
                </p>
                <button
                  onClick={handleNewConversation}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                >
                  Start Your First Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
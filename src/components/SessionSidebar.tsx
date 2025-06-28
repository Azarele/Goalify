import React, { useState, useEffect } from 'react';
import { X, Calendar, MessageCircle, Clock, Search, Filter, ArrowRight, Plus } from 'lucide-react';
import { UserProfile } from '../types/coaching';
import { getUserConversations } from '../services/database';
import { useAuth } from '../hooks/useAuth';

interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  completed: boolean;
}

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentConversationId: string | null;
  userProfile: UserProfile | null;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
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
  
  useEffect(() => {
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      const conversationsData = await getUserConversations(user.id);
      setConversations(conversationsData);
      console.log('Loaded conversations:', conversationsData.length);
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
    console.log('Conversation clicked:', conversation.id, conversation.title);
    
    // Step 2: Handle the User Click Event - pass conversation ID to parent
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
        
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <div 
              key={conversation.id}
              onClick={() => handleConversationClick(conversation)}
              className={`p-3 rounded-lg transition-all duration-300 cursor-pointer border group hover:scale-[1.02] ${
                currentConversationId === conversation.id
                  ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/50 shadow-lg ring-2 ring-purple-400/30'
                  : 'bg-slate-700/30 hover:bg-slate-600/40 border-slate-600/30 hover:border-purple-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white group-hover:text-purple-200 transition-colors line-clamp-1 flex-1 mr-2">
                  {conversation.title}
                </span>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-xs text-purple-300">
                    {conversation.updated_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <ArrowRight className={`w-3 h-3 text-purple-400 transition-all duration-200 ${
                    currentConversationId === conversation.id ? 'opacity-100 translate-x-1' : 'opacity-0 group-hover:opacity-100'
                  }`} />
                </div>
              </div>
              <div className="text-xs text-purple-400 mb-2">
                {conversation.updated_at.toLocaleDateString()}
              </div>
              <div className="flex items-center justify-between text-xs">
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
          ))}
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

      {/* Sidebar */}
      <div className={`
        fixed lg:relative top-0 left-0 h-full w-80 bg-gradient-to-b from-slate-800 to-purple-900 border-r border-purple-500/20 z-50
        transform transition-transform duration-300 ease-in-out backdrop-blur-sm
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isOpen ? 'lg:block' : 'lg:hidden'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-purple-500/20">
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
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
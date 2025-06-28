import React, { useState } from 'react';
import { CheckCircle, X, Loader, Star, Trophy, AlertCircle } from 'lucide-react';

interface Goal {
  id: string;
  description: string;
  xpValue: number;
  difficulty: 'easy' | 'medium' | 'hard';
  motivation: number;
  completed: boolean;
  completedAt?: Date;
  completionReasoning?: string;
  deadline?: Date;
  createdAt: Date;
}

interface GoalCompletionModalProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (goalId: string, reasoning: string) => Promise<{ verified: boolean; feedback: string }>;
  onComplete: (goalId: string, xpGained: number) => void;
}

export const GoalCompletionModal: React.FC<GoalCompletionModalProps> = ({
  goal,
  isOpen,
  onClose,
  onVerify,
  onComplete
}) => {
  const [reasoning, setReasoning] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSubmit = async () => {
    if (!reasoning.trim()) {
      return;
    }

    setIsVerifying(true);
    setShowFeedback(false);

    try {
      const result = await onVerify(goal.id, reasoning);
      setIsVerified(result.verified);
      setFeedback(result.feedback);
      setShowFeedback(true);
      
      if (result.verified) {
        // Award XP after a brief delay to show feedback
        setTimeout(() => {
          onComplete(goal.id, goal.xpValue);
          handleClose();
        }, 2000);
      }
    } catch (error) {
      setFeedback('Verification failed. Please try again.');
      setIsVerified(false);
      setShowFeedback(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setReasoning('');
    setFeedback('');
    setIsVerified(null);
    setShowFeedback(false);
    onClose();
  };

  const handleTryAgain = () => {
    setShowFeedback(false);
    setIsVerified(null);
    setFeedback('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-purple-900 rounded-2xl shadow-2xl max-w-md w-full border border-purple-500/20">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Goal Completion</h3>
                <p className="text-sm text-purple-300">Verify your achievement</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20 mb-4">
              <p className="text-white font-medium mb-2">Your Challenge:</p>
              <p className="text-purple-200 text-sm">{goal.description}</p>
              <div className="flex items-center space-x-2 mt-3">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-300 text-sm font-medium">{goal.xpValue} XP Reward</span>
              </div>
            </div>

            {!showFeedback ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white">
                  Fantastic! Please explain how you completed this challenge: <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Describe the specific actions you took to complete this challenge..."
                  rows={4}
                  className="w-full p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 resize-none"
                  disabled={isVerifying}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-lg p-4 border ${
                  isVerified 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-yellow-500/10 border-yellow-500/20'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {isVerified ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="font-medium text-green-300">Verified!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        <span className="font-medium text-yellow-300">Needs More Detail</span>
                      </>
                    )}
                  </div>
                  <p className={`text-sm ${isVerified ? 'text-green-200' : 'text-yellow-200'}`}>
                    {feedback}
                  </p>
                </div>

                {isVerified && (
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-medium">+{goal.xpValue} XP awarded!</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            {!showFeedback ? (
              <>
                <button
                  onClick={handleClose}
                  disabled={isVerifying}
                  className="flex-1 py-3 px-4 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!reasoning.trim() || isVerifying}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center justify-center space-x-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      <span>Submit</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {!isVerified && (
                  <button
                    onClick={handleTryAgain}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-105"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 px-4 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
                >
                  {isVerified ? 'Continue' : 'Close'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
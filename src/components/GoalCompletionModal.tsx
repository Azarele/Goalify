import React, { useState } from 'react';
import { CheckCircle, X, Loader, Star, Trophy } from 'lucide-react';

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
  onVerify: (goalId: string, reasoning: string) => Promise<boolean>;
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
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!reasoning.trim()) {
      setErrorMessage('Please explain how you accomplished this goal.');
      return;
    }

    setIsVerifying(true);
    setVerificationFailed(false);
    setErrorMessage('');

    try {
      const verified = await onVerify(goal.id, reasoning);
      
      if (verified) {
        onComplete(goal.id, goal.xpValue);
        onClose();
        setReasoning('');
      } else {
        setVerificationFailed(true);
        setErrorMessage('Please provide more detail about how you completed this goal.');
      }
    } catch (error) {
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setReasoning('');
    setVerificationFailed(false);
    setErrorMessage('');
    onClose();
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
              <p className="text-white font-medium mb-2">Your Goal:</p>
              <p className="text-purple-200 text-sm">{goal.description}</p>
              <div className="flex items-center space-x-2 mt-3">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-300 text-sm font-medium">{goal.xpValue} XP Reward</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-white">
                Great work! How did you accomplish this? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="Describe the specific actions you took to complete this goal..."
                rows={4}
                className="w-full p-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 resize-none"
                disabled={isVerifying}
              />
              
              {errorMessage && (
                <p className="text-red-400 text-sm">{errorMessage}</p>
              )}

              {verificationFailed && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm">
                    Please provide more specific details about your actions and results.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-3">
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
                  <span>Claim Reward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
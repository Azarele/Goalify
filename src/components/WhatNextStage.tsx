import React, { useState } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft, Calendar, Bell, Target } from 'lucide-react';

interface WhatNextStageProps {
  initialAction: string;
  initialDeadline: Date | null;
  initialMotivation: number;
  onNext: (action: string, deadline: Date | null, motivation: number) => void;
  onBack: () => void;
}

export const WhatNextStage: React.FC<WhatNextStageProps> = ({ 
  initialAction, 
  initialDeadline, 
  initialMotivation, 
  onNext, 
  onBack 
}) => {
  const [action, setAction] = useState(initialAction);
  const [deadline, setDeadline] = useState(
    initialDeadline ? initialDeadline.toISOString().split('T')[0] : ''
  );
  const [motivation, setMotivation] = useState(initialMotivation || 7);
  const [checkIn, setCheckIn] = useState(false);

  const handleNext = () => {
    if (action.trim()) {
      const deadlineDate = deadline ? new Date(deadline) : null;
      onNext(action.trim(), deadlineDate, motivation);
    }
  };

  const getMotivationColor = (level: number) => {
    if (level >= 8) return 'text-green-600';
    if (level >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMotivationText = (level: number) => {
    if (level >= 8) return 'Highly motivated';
    if (level >= 6) return 'Moderately motivated';
    return 'Low motivation - consider breaking this down';
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">What Next - Your commitment</h2>
        <p className="text-gray-600">Time to commit to specific action. What will you actually do?</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Target className="w-4 h-4 inline mr-2" />
            What specific action will you take?
          </label>
          <textarea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="I will... (be specific about what, when, where, how)"
            rows={4}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Calendar className="w-4 h-4 inline mr-2" />
            By when will you do this? (Optional but recommended)
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            On a scale of 1-10, how motivated are you to do this?
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="10"
              value={motivation}
              onChange={(e) => setMotivation(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 (Not at all)</span>
              <span className={`font-medium ${getMotivationColor(motivation)}`}>
                {motivation}/10 - {getMotivationText(motivation)}
              </span>
              <span>10 (Extremely)</span>
            </div>
          </div>
        </div>

        {motivation < 6 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-800 mb-2">Low motivation detected</h3>
            <p className="text-sm text-yellow-700">
              Consider: Could you break this into smaller steps? What would make this more achievable? 
              What might be getting in the way?
            </p>
          </div>
        )}

        <div className="bg-green-50 rounded-lg p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={checkIn}
              onChange={(e) => setCheckIn(e.target.checked)}
              className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <div>
              <div className="flex items-center space-x-1">
                <Bell className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Schedule a check-in</span>
              </div>
              <span className="text-xs text-gray-600 block mt-1">
                Get a reminder in one week to reflect on your progress
              </span>
            </div>
          </label>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Before you commit, consider:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• What might get in the way of doing this?</li>
            <li>• How will you remind yourself?</li>
            <li>• Who could support you or hold you accountable?</li>
            <li>• What will you do if you get stuck?</li>
          </ul>
        </div>

        <div className="flex justify-between pt-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Options</span>
          </button>
          <button
            onClick={handleNext}
            disabled={!action.trim()}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              action.trim()
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Complete Session</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
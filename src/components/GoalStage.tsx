import React, { useState } from 'react';
import { Target, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

interface GoalStageProps {
  initialGoal: string;
  onNext: (goal: string) => void;
  onBack: () => void;
}

export const GoalStage: React.FC<GoalStageProps> = ({ initialGoal, onNext, onBack }) => {
  const [goal, setGoal] = useState(initialGoal);
  const [successCriteria, setSuccessCriteria] = useState('');

  const handleNext = () => {
    if (goal.trim()) {
      onNext(goal.trim());
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Goal - What do you want to achieve?</h2>
        <p className="text-gray-600">Define what success looks like for this coaching session.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What would you like to achieve by the end of this conversation?
          </label>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="I want to... / By the end of this session, I will have..."
            rows={4}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <CheckCircle className="w-4 h-4 inline mr-2" />
            How will you know you've achieved this? (Optional)
          </label>
          <textarea
            value={successCriteria}
            onChange={(e) => setSuccessCriteria(e.target.value)}
            placeholder="I'll know I've succeeded when... / I'll feel... / I'll be able to..."
            rows={3}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="bg-teal-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Coaching Questions to Consider:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Is this goal realistic for one session?</li>
            <li>• What would make this conversation valuable for you?</li>
            <li>• How does this connect to your bigger picture?</li>
          </ul>
        </div>

        <div className="flex justify-between pt-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Topic</span>
          </button>
          <button
            onClick={handleNext}
            disabled={!goal.trim()}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              goal.trim()
                ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Continue to Reality</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
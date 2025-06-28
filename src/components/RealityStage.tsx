import React, { useState } from 'react';
import { Eye, ArrowRight, ArrowLeft, AlertCircle, Heart, Users } from 'lucide-react';

interface RealityStageProps {
  initialReality: string;
  onNext: (reality: string) => void;
  onBack: () => void;
}

export const RealityStage: React.FC<RealityStageProps> = ({ initialReality, onNext, onBack }) => {
  const [reality, setReality] = useState(initialReality);
  const [obstacles, setObstacles] = useState('');
  const [attempts, setAttempts] = useState('');
  const [emotions, setEmotions] = useState('');

  const handleNext = () => {
    if (reality.trim()) {
      onNext(reality.trim());
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reality - Where are you now?</h2>
        <p className="text-gray-600">Let's explore your current situation honestly and openly.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Where are you right now in relation to your goal?
          </label>
          <textarea
            value={reality}
            onChange={(e) => setReality(e.target.value)}
            placeholder="Describe your current situation, what's happening right now..."
            rows={4}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Obstacles
            </label>
            <textarea
              value={obstacles}
              onChange={(e) => setObstacles(e.target.value)}
              placeholder="What's getting in the way?"
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Previous Attempts
            </label>
            <textarea
              value={attempts}
              onChange={(e) => setAttempts(e.target.value)}
              placeholder="What have you tried before?"
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Heart className="w-4 h-4 inline mr-1" />
              How You Feel
            </label>
            <textarea
              value={emotions}
              onChange={(e) => setEmotions(e.target.value)}
              placeholder="Your emotions about this?"
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Reflection Questions:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• What patterns do you notice in your situation?</li>
            <li>• What's working well already?</li>
            <li>• What would need to change for you to reach your goal?</li>
            <li>• Who else is involved or affected?</li>
          </ul>
        </div>

        <div className="flex justify-between pt-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Goal</span>
          </button>
          <button
            onClick={handleNext}
            disabled={!reality.trim()}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              reality.trim()
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Explore Options</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Target, ArrowRight, Lightbulb } from 'lucide-react';

interface TopicStageProps {
  initialTopic: string;
  onNext: (topic: string) => void;
}

const topicSuggestions = [
  'Time management and productivity',
  'Career development and goals',
  'Work-life balance',
  'Confidence and self-belief',
  'Communication skills',
  'Decision making',
  'Stress management',
  'Leadership development',
  'Personal relationships',
  'Learning and growth'
];

export const TopicStage: React.FC<TopicStageProps> = ({ initialTopic, onNext }) => {
  const [topic, setTopic] = useState(initialTopic);
  const [showSuggestions, setShowSuggestions] = useState(!initialTopic);

  const handleNext = () => {
    if (topic.trim()) {
      onNext(topic.trim());
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setTopic(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Topic - What's on your mind?</h2>
        <p className="text-gray-600">Let's start by identifying what you'd like to focus on in today's session.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What would you like to explore today?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Describe what's on your mind or what you'd like to focus on..."
            rows={4}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {showSuggestions && (
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Need inspiration? Here are some common topics:</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {topicSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className="text-left p-3 text-sm text-blue-700 bg-white rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showSuggestions && (
          <button
            onClick={() => setShowSuggestions(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Show topic suggestions
          </button>
        )}

        <div className="flex justify-between pt-6">
          <div></div>
          <button
            onClick={handleNext}
            disabled={!topic.trim()}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              topic.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Continue to Goal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
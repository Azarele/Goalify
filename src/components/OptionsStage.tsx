import React, { useState } from 'react';
import { Lightbulb, ArrowRight, ArrowLeft, Plus, Star, Zap } from 'lucide-react';
import { CoachingOption } from '../types/coaching';

interface OptionsStageProps {
  initialOptions: CoachingOption[];
  onNext: (options: CoachingOption[]) => void;
  onBack: () => void;
}

export const OptionsStage: React.FC<OptionsStageProps> = ({ initialOptions, onNext, onBack }) => {
  const [options, setOptions] = useState<CoachingOption[]>(
    initialOptions.length > 0 ? initialOptions : []
  );
  const [newOption, setNewOption] = useState('');

  const addOption = () => {
    if (newOption.trim()) {
      const option: CoachingOption = {
        id: Date.now().toString(),
        text: newOption.trim(),
        feasibility: 5,
        impact: 5
      };
      setOptions([...options, option]);
      setNewOption('');
    }
  };

  const removeOption = (id: string) => {
    setOptions(options.filter(opt => opt.id !== id));
  };

  const updateOption = (id: string, field: 'feasibility' | 'impact', value: number) => {
    setOptions(options.map(opt => 
      opt.id === id ? { ...opt, [field]: value } : opt
    ));
  };

  const handleNext = () => {
    if (options.length > 0) {
      onNext(options);
    }
  };

  const creativityPrompts = [
    "What would you do if you had unlimited resources?",
    "What would someone you admire do in this situation?",
    "What's the smallest step you could take?",
    "What would you try if you knew you couldn't fail?",
    "Who could help you with this?"
  ];

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lightbulb className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Options - What could you do?</h2>
        <p className="text-gray-600">Let's brainstorm all possible approaches - be creative!</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Add a new option or approach:
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addOption()}
              placeholder="What could you do? Think creatively..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={addOption}
              disabled={!newOption.trim()}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                newOption.trim()
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {options.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Your Options:</h3>
            <div className="space-y-4">
              {options.map((option) => (
                <div key={option.id} className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-gray-900 flex-1">{option.text}</p>
                    <button
                      onClick={() => removeOption(option.id)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <Star className="w-3 h-3 inline mr-1" />
                        Feasibility (1-10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={option.feasibility}
                        onChange={(e) => updateOption(option.id, 'feasibility', Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-500">{option.feasibility}/10</span>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <Zap className="w-3 h-3 inline mr-1" />
                        Impact (1-10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={option.impact}
                        onChange={(e) => updateOption(option.id, 'impact', Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-500">{option.impact}/10</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-orange-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Need inspiration? Try asking yourself:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            {creativityPrompts.map((prompt, index) => (
              <li key={index}>• {prompt}</li>
            ))}
          </ul>
        </div>

        <div className="flex justify-between pt-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Reality</span>
          </button>
          <button
            onClick={handleNext}
            disabled={options.length === 0}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              options.length > 0
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Plan Action</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { BookOpen, Save, Download, RefreshCw } from 'lucide-react';

export const SelfCoaching: React.FC = () => {
  const [currentStage, setCurrentStage] = useState('topic');
  const [responses, setResponses] = useState({
    topic: '',
    goal: '',
    reality: '',
    options: '',
    whatNext: ''
  });

  const stages = [
    {
      id: 'topic',
      title: 'Topic',
      question: 'What would you like to focus on today?',
      prompt: 'Take a moment to reflect on what\'s on your mind or what you\'d like to explore...',
      color: 'blue'
    },
    {
      id: 'goal',
      title: 'Goal',
      question: 'What would you like to achieve by the end of this reflection?',
      prompt: 'Think about what success would look like for this self-coaching session...',
      color: 'teal'
    },
    {
      id: 'reality',
      title: 'Reality',
      question: 'Where are you right now in relation to your goal?',
      prompt: 'Be honest about your current situation, what\'s working, what\'s not...',
      color: 'purple'
    },
    {
      id: 'options',
      title: 'Options',
      question: 'What could you do? What are your options?',
      prompt: 'Brainstorm freely - what are all the possible approaches you could take?',
      color: 'orange'
    },
    {
      id: 'whatNext',
      title: 'What Next',
      question: 'What will you actually do, and when?',
      prompt: 'Be specific about your commitment. What action will you take?',
      color: 'green'
    }
  ];

  const currentStageData = stages.find(s => s.id === currentStage) || stages[0];
  const currentIndex = stages.findIndex(s => s.id === currentStage);

  const handleResponseChange = (value: string) => {
    setResponses(prev => ({
      ...prev,
      [currentStage]: value
    }));
  };

  const nextStage = () => {
    if (currentIndex < stages.length - 1) {
      setCurrentStage(stages[currentIndex + 1].id);
    }
  };

  const prevStage = () => {
    if (currentIndex > 0) {
      setCurrentStage(stages[currentIndex - 1].id);
    }
  };

  const saveSession = () => {
    const sessionData = {
      date: new Date().toISOString(),
      responses
    };
    localStorage.setItem(`self-coaching-${Date.now()}`, JSON.stringify(sessionData));
    alert('Session saved locally!');
  };

  const exportSession = () => {
    const content = stages.map(stage => 
      `${stage.title.toUpperCase()}: ${stage.question}\n${responses[stage.id as keyof typeof responses] || 'No response'}\n\n`
    ).join('');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `self-coaching-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const resetSession = () => {
    setResponses({
      topic: '',
      goal: '',
      reality: '',
      options: '',
      whatNext: ''
    });
    setCurrentStage('topic');
  };

  const colorMap = {
    blue: 'bg-blue-600',
    teal: 'bg-teal-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
    green: 'bg-green-600'
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <BookOpen className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Self-Coaching Mode</h2>
        <p className="text-gray-600">Guide yourself through the TGROW model with reflective journaling</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                  ${currentStage === stage.id ? colorMap[stage.color as keyof typeof colorMap] : 
                    responses[stage.id as keyof typeof responses] ? colorMap[stage.color as keyof typeof colorMap] : 'bg-gray-300'}
                  ${currentStage === stage.id ? 'ring-4 ring-blue-200' : ''}
                  transition-all duration-300
                `}>
                  {stage.title.charAt(0)}
                </div>
                {index < stages.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    responses[stage.id as keyof typeof responses] ? colorMap[stage.color as keyof typeof colorMap] : 'bg-gray-300'
                  } transition-all duration-300`} />
                )}
              </div>
              <span className={`mt-2 text-xs font-medium ${
                currentStage === stage.id ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {stage.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Stage */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className={`p-6 ${colorMap[currentStageData.color as keyof typeof colorMap]} text-white rounded-t-lg`}>
          <h3 className="text-xl font-bold mb-2">{currentStageData.title}</h3>
          <p className="text-lg">{currentStageData.question}</p>
          <p className="text-sm opacity-90 mt-2">{currentStageData.prompt}</p>
        </div>
        
        <div className="p-6">
          <textarea
            value={responses[currentStage as keyof typeof responses]}
            onChange={(e) => handleResponseChange(e.target.value)}
            placeholder="Take your time to reflect and write your thoughts here..."
            rows={8}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStage}
              disabled={currentIndex === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currentIndex === 0 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              Previous
            </button>
            
            <button
              onClick={nextStage}
              disabled={currentIndex === stages.length - 1}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currentIndex === stages.length - 1 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : `${colorMap[currentStageData.color as keyof typeof colorMap]} hover:opacity-90 text-white`
              }`}
            >
              {currentIndex === stages.length - 1 ? 'Complete' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={saveSession}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save Session</span>
        </button>
        
        <button
          onClick={exportSession}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
        
        <button
          onClick={resetSession}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Start Over</span>
        </button>
      </div>
    </div>
  );
};
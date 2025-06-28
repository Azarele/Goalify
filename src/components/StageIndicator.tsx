import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface StageIndicatorProps {
  currentStage: string;
  completedStages: string[];
}

const stages = [
  { id: 'topic', label: 'Topic', color: 'blue' },
  { id: 'goal', label: 'Goal', color: 'teal' },
  { id: 'reality', label: 'Reality', color: 'purple' },
  { id: 'options', label: 'Options', color: 'orange' },
  { id: 'whatNext', label: 'What Next', color: 'green' }
];

const colorMap = {
  blue: 'bg-blue-600',
  teal: 'bg-teal-600',
  purple: 'bg-purple-600',
  orange: 'bg-orange-600',
  green: 'bg-green-600'
};

export const StageIndicator: React.FC<StageIndicatorProps> = ({ currentStage, completedStages }) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Coaching Progress</h3>
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const isCompleted = completedStages.includes(stage.id);
          const isCurrent = currentStage === stage.id;
          const colorClass = colorMap[stage.color as keyof typeof colorMap];
          
          return (
            <div key={stage.id} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                  ${isCompleted ? colorClass : isCurrent ? colorClass : 'bg-gray-300'}
                  ${isCurrent ? 'ring-4 ring-blue-200' : ''}
                  transition-all duration-300
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <span className="text-sm">{stage.label.charAt(0)}</span>
                  )}
                </div>
                {index < stages.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    isCompleted ? colorClass : 'bg-gray-300'
                  } transition-all duration-300`} />
                )}
              </div>
              <span className={`mt-2 text-xs font-medium ${
                isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
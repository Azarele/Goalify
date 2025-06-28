import React, { useState } from 'react';
import { BookOpen, MessageCircle, Users, Target, HelpCircle } from 'lucide-react';

export const CoachTools: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState('reference');

  const tools = [
    { id: 'reference', label: 'Quick Reference', icon: BookOpen },
    { id: 'questions', label: 'Powerful Questions', icon: HelpCircle },
    { id: 'skills', label: 'Coaching Skills', icon: Target },
    { id: 'styles', label: 'Coaching Styles', icon: Users }
  ];

  const renderTool = () => {
    switch (selectedTool) {
      case 'reference':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900">TGROW Model Quick Reference</h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">T - Topic</h4>
                <p className="text-blue-800 text-sm mb-2">Help the coachee identify what they want to focus on.</p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• "What would you like to focus on today?"</li>
                  <li>• "What's on your mind?"</li>
                  <li>• "What would be most valuable to explore?"</li>
                </ul>
              </div>

              <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                <h4 className="font-semibold text-teal-900 mb-2">G - Goal</h4>
                <p className="text-teal-800 text-sm mb-2">Clarify what they want to achieve from the session.</p>
                <ul className="text-teal-700 text-sm space-y-1">
                  <li>• "What would you like to achieve by the end of our conversation?"</li>
                  <li>• "How will you know you've been successful?"</li>
                  <li>• "What does success look like?"</li>
                </ul>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">R - Reality</h4>
                <p className="text-purple-800 text-sm mb-2">Explore their current situation objectively.</p>
                <ul className="text-purple-700 text-sm space-y-1">
                  <li>• "What's happening right now?"</li>
                  <li>• "What have you tried so far?"</li>
                  <li>• "What's getting in the way?"</li>
                </ul>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-2">O - Options</h4>
                <p className="text-orange-800 text-sm mb-2">Generate multiple possibilities and approaches.</p>
                <ul className="text-orange-700 text-sm space-y-1">
                  <li>• "What could you do?"</li>
                  <li>• "What else?"</li>
                  <li>• "What would you try if you couldn't fail?"</li>
                </ul>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">W - What Next</h4>
                <p className="text-green-800 text-sm mb-2">Secure commitment to specific action.</p>
                <ul className="text-green-700 text-sm space-y-1">
                  <li>• "What will you do?"</li>
                  <li>• "When will you do it?"</li>
                  <li>• "What might get in the way?"</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'questions':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Powerful Coaching Questions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Opening Questions</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• What would you like to focus on?</li>
                    <li>• What's most important right now?</li>
                    <li>• Where would you like to start?</li>
                    <li>• What's on your mind?</li>
                  </ul>
                </div>

                <h4 className="font-semibold text-gray-800">Exploring Questions</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• What else?</li>
                    <li>• Tell me more about that...</li>
                    <li>• What's behind that?</li>
                    <li>• How do you feel about that?</li>
                  </ul>
                </div>

                <h4 className="font-semibold text-gray-800">Challenging Questions</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• What assumptions are you making?</li>
                    <li>• What if the opposite were true?</li>
                    <li>• What are you not seeing?</li>
                    <li>• What would X person say?</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800">Action Questions</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• What's the first step?</li>
                    <li>• What will you do differently?</li>
                    <li>• When will you start?</li>
                    <li>• How will you know you're on track?</li>
                  </ul>
                </div>

                <h4 className="font-semibold text-gray-800">Scaling Questions</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• On a scale of 1-10, how important is this?</li>
                    <li>• How motivated are you to do this?</li>
                    <li>• Where are you now on your journey?</li>
                    <li>• What would move you from a 6 to an 8?</li>
                  </ul>
                </div>

                <h4 className="font-semibold text-gray-800">Future-Focused Questions</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• What does success look like?</li>
                    <li>• If this were resolved, what would be different?</li>
                    <li>• What would the ideal outcome be?</li>
                    <li>• How will you celebrate success?</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'skills':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Essential Coaching Skills</h3>
            
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Active Listening</h4>
                <p className="text-gray-700 mb-3">Listen not just to words, but to meaning, emotion, and what's not being said.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-green-700 mb-2">Do:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Maintain eye contact</li>
                      <li>• Use minimal encouragers ("mmm", "yes")</li>
                      <li>• Reflect back what you hear</li>
                      <li>• Notice tone and body language</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-red-700 mb-2">Avoid:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Interrupting</li>
                      <li>• Preparing your response while they speak</li>
                      <li>• Judging or evaluating</li>
                      <li>• Giving advice too quickly</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Powerful Questions</h4>
                <p className="text-gray-700 mb-3">Use open-ended questions to promote discovery and insight.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-green-700 mb-2">Effective Questions:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Start with What, How, When, Where</li>
                      <li>• Are brief and focused</li>
                      <li>• Invite exploration</li>
                      <li>• Challenge assumptions gently</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-red-700 mb-2">Avoid Questions That:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Start with "Why" (can feel judgmental)</li>
                      <li>• Are leading or loaded</li>
                      <li>• Are multiple questions at once</li>
                      <li>• Have obvious yes/no answers</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">Creating Awareness</h4>
                <p className="text-gray-700 mb-3">Help the coachee see new perspectives and possibilities.</p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• <strong>Reflect:</strong> "I notice you mentioned X three times..."</li>
                  <li>• <strong>Summarize:</strong> "So if I understand correctly..."</li>
                  <li>• <strong>Reframe:</strong> "Another way to look at this might be..."</li>
                  <li>• <strong>Challenge:</strong> "What if the opposite were true?"</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'styles':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Coaching Styles & Approaches</h3>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-900 mb-3">Directive vs. Non-Directive</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-blue-800 mb-2">Directive Coaching</h5>
                    <p className="text-blue-700 text-sm mb-2">More structured, coach-led approach</p>
                    <ul className="text-blue-600 text-sm space-y-1">
                      <li>• Providing frameworks and models</li>
                      <li>• Offering suggestions and options</li>
                      <li>• Sharing relevant experience</li>
                      <li>• Setting clear structure</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-800 mb-2">Non-Directive Coaching</h5>
                    <p className="text-blue-700 text-sm mb-2">Client-led, discovery-focused approach</p>
                    <ul className="text-blue-600 text-sm space-y-1">
                      <li>• Asking powerful questions</li>
                      <li>• Following the client's agenda</li>
                      <li>• Trusting the client has answers</li>
                      <li>• Creating space for insight</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="font-semibold text-green-900 mb-3">Formal vs. Corridor Coaching</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-green-800 mb-2">Formal Coaching</h5>
                    <ul className="text-green-600 text-sm space-y-1">
                      <li>• Scheduled sessions with clear boundaries</li>
                      <li>• Structured approach (like TGROW)</li>
                      <li>• Professional tone and language</li>
                      <li>• Documented outcomes and actions</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-green-800 mb-2">Corridor Coaching</h5>
                    <ul className="text-green-600 text-sm space-y-1">
                      <li>• Informal, spontaneous conversations</li>
                      <li>• Casual tone and setting</li>
                      <li>• Brief, focused interactions</li>
                      <li>• Opportunistic coaching moments</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h4 className="font-semibold text-purple-900 mb-3">When to Use Different Styles</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-purple-800 mb-2">Use More Directive Coaching When:</h5>
                    <ul className="text-purple-600 text-sm space-y-1">
                      <li>• Client is new to coaching</li>
                      <li>• Time is limited</li>
                      <li>• Client specifically asks for input</li>
                      <li>• Safety or compliance issues are involved</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-purple-800 mb-2">Use More Non-Directive Coaching When:</h5>
                    <ul className="text-purple-600 text-sm space-y-1">
                      <li>• Client is experienced and self-aware</li>
                      <li>• You want to develop independence</li>
                      <li>• The issue is personal or sensitive</li>
                      <li>• You want to promote creativity</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Coach Tools & Resources</h2>
        <p className="text-gray-600">Resources for learning and practicing coaching skills</p>
      </div>

      {/* Tool Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex border-b border-gray-200">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  selectedTool === tool.id 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="p-6">
          {renderTool()}
        </div>
      </div>
    </div>
  );
};
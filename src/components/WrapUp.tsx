import React, { useState } from 'react';
import { CheckCircle, Star, Download, Calendar, Home } from 'lucide-react';
import { CoachingSession } from '../types/coaching';

interface WrapUpProps {
  session: CoachingSession;
  onNewSession: () => void;
  onExport: () => void;
}

export const WrapUp: React.FC<WrapUpProps> = ({ session, onNewSession, onExport }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const submitFeedback = () => {
    // Save rating and feedback to session
    session.rating = rating;
    session.feedback = feedback;
    setFeedbackSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
        <p className="text-gray-600">Great work! Let's wrap up and plan next steps.</p>
      </div>

      <div className="space-y-6">
        {/* Session Summary */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Your Session Summary</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 text-sm">Topic:</h4>
              <p className="text-gray-900">{session.topic}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 text-sm">Goal:</h4>
              <p className="text-gray-900">{session.goal}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 text-sm">Your Commitment:</h4>
              <p className="text-gray-900">{session.whatNext.action}</p>
              {session.whatNext.deadline && (
                <p className="text-gray-600 text-sm">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Due: {session.whatNext.deadline.toLocaleDateString()}
                </p>
              )}
              <p className="text-gray-600 text-sm">
                Motivation level: {session.whatNext.motivation}/10
              </p>
            </div>
          </div>
        </div>

        {/* Rating */}
        {!feedbackSubmitted && (
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">How was this session?</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate this session (1-5 stars):
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`w-8 h-8 ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      } hover:text-yellow-400 transition-colors`}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Any additional thoughts? (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What worked well? What could be improved?"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                onClick={submitFeedback}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        )}

        {feedbackSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">Thank you for your feedback!</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={onExport}
            className="flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Summary</span>
          </button>
          
          <button
            onClick={onNewSession}
            className="flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>New Session</span>
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center space-x-2 py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>

        {/* Next Steps Reminder */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Remember:</h3>
          <p className="text-sm text-yellow-700">
            The real value comes from taking action. Your commitment was: <strong>{session.whatNext.action}</strong>
            {session.whatNext.deadline && (
              <span> by {session.whatNext.deadline.toLocaleDateString()}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
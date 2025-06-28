import React, { useState } from 'react';
import { BookOpen, Save, Download, Lightbulb } from 'lucide-react';

const REFLECTION_PROMPTS = [
  "What's really on my mind today?",
  "What would I like to achieve in the next week?",
  "What's working well in my life right now?",
  "What challenges am I facing?",
  "What would I do if I knew I couldn't fail?",
  "What am I grateful for today?",
  "What patterns do I notice in my thinking?",
  "What would my best self do in this situation?",
  "What's one small step I could take today?",
  "How do I want to feel at the end of this week?"
];

export const ReflectionJournal: React.FC = () => {
  const [entry, setEntry] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [savedEntries, setSavedEntries] = useState<Array<{
    id: string;
    content: string;
    date: Date;
    prompt?: string;
  }>>([]);

  const handlePromptSelect = (prompt: string) => {
    setSelectedPrompt(prompt);
    setEntry(prev => prev + (prev ? '\n\n' : '') + `${prompt}\n\n`);
  };

  const saveEntry = () => {
    if (!entry.trim()) return;

    const newEntry = {
      id: Date.now().toString(),
      content: entry,
      date: new Date(),
      prompt: selectedPrompt
    };

    setSavedEntries(prev => [newEntry, ...prev]);
    
    // Save to localStorage
    const stored = localStorage.getItem('reflection_entries') || '[]';
    const entries = JSON.parse(stored);
    entries.unshift(newEntry);
    localStorage.setItem('reflection_entries', JSON.stringify(entries));

    setEntry('');
    setSelectedPrompt('');
  };

  const exportEntry = () => {
    if (!entry.trim()) return;

    const content = `Reflection Entry - ${new Date().toLocaleDateString()}\n\n${entry}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reflection-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <BookOpen className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Reflection Journal</h2>
        <p className="text-gray-600">A space for personal reflection and insight</p>
      </div>

      {/* Prompts */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-600" />
          <h3 className="font-semibold text-gray-900">Reflection Prompts</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REFLECTION_PROMPTS.map((prompt, index) => (
            <button
              key={index}
              onClick={() => handlePromptSelect(prompt)}
              className="text-left p-3 text-sm bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg transition-colors border border-purple-200"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Journal Entry */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Your Reflection</h3>
          <p className="text-sm text-gray-600 mt-1">Write freely about what's on your mind</p>
        </div>
        
        <div className="p-6">
          <textarea
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Start writing your thoughts here... What's on your mind today?"
            rows={12}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          
          <div className="flex justify-between mt-4">
            <div className="text-sm text-gray-500">
              {entry.length} characters
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={exportEntry}
                disabled={!entry.trim()}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  entry.trim()
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              <button
                onClick={saveEntry}
                disabled={!entry.trim()}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  entry.trim()
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>Save Entry</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      {savedEntries.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Recent Reflections</h3>
          </div>
          
          <div className="p-6 space-y-4">
            {savedEntries.slice(0, 3).map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-500">
                    {entry.date.toLocaleDateString()}
                  </span>
                  {entry.prompt && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      Prompted
                    </span>
                  )}
                </div>
                <p className="text-gray-700 text-sm line-clamp-3">
                  {entry.content.substring(0, 200)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
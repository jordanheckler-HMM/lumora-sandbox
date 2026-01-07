import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { runModel } from '../api';
import { useAppState } from '../store/appState';
import { callGlobalHandler } from '../utils/globalHandlers';
import toast from 'react-hot-toast';

interface DocumentAIBarProps {
  editor: Editor | null;
  currentModel: string;
}

type AIAction = 'rewrite' | 'summarize' | 'expand' | 'shorten' | 'improve' | 'continue' | 'explain';

const AI_PROMPTS: Record<AIAction, string> = {
  rewrite: `Rewrite the following text to be clearer, more polished, and high quality. 
Return ONLY the rewritten text, nothing else.

TEXT:
<<<
{{text}}
>>>`,
  
  summarize: `Summarize the following text in a clear, concise way. 
Return ONLY the summary.

TEXT:
<<<
{{text}}
>>>`,
  
  expand: `Expand the following text with more detail and depth. 
Return ONLY the expanded version.

TEXT:
<<<
{{text}}
>>>`,
  
  shorten: `Shorten this text while keeping all meaning. 
Return ONLY the shortened text.

TEXT:
<<<
{{text}}
>>>`,
  
  improve: `Improve the writing quality, clarity, and flow. 
Return ONLY the improved text.

TEXT:
<<<
{{text}}
>>>`,
  
  continue: `Continue the following text naturally. 
Return ONLY the continuation, not the original.

TEXT:
<<<
{{text}}
>>>`,
  
  explain: `Explain the meaning of the following text clearly and simply. 
Return ONLY the explanation.

TEXT:
<<<
{{text}}
>>>`
};

export const DocumentAIBar = ({ editor, currentModel }: DocumentAIBarProps) => {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const { addAIResponse } = useAppState();

  const handleAIAction = async (action: AIAction) => {
    if (!editor || !currentModel) {
      toast('Please select a model from the sidebar first', { icon: '⚠️' });
      return;
    }

    try {
      setLoading(true);
      setCurrentAction(action);

      // Auto-open sidebar to AI Assistant tab
      callGlobalHandler('documentSidebar');

      // Get selected text or entire document
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      
      let textToProcess: string;
      if (hasSelection) {
        textToProcess = editor.state.doc.textBetween(from, to);
      } else {
        textToProcess = editor.getText();
      }

      if (!textToProcess.trim()) {
        toast('No text to process', { icon: '⚠️' });
        return;
      }

      // Build prompt
      const prompt = AI_PROMPTS[action].replace('{{text}}', textToProcess);

      // Call AI
      const response = await runModel(currentModel, prompt);

      // Clean up response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```')) {
        const lines = cleanedResponse.split('\n');
        lines.shift(); // Remove first ```
        if (lines[lines.length - 1].trim() === '```') {
          lines.pop(); // Remove last ```
        }
        cleanedResponse = lines.join('\n');
      }

      // Send response to AI Panel - ONLY update sidebar, NOT the document
      const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
      const promptPreview = textToProcess.length > 100 
        ? textToProcess.substring(0, 100) + '...' 
        : textToProcess;
      
      // Add to store (persists when sidebar closes)
      addAIResponse(actionLabel, cleanedResponse, promptPreview);

      // DO NOT modify the document automatically
      // User must explicitly click Insert/Replace/Replace All in the sidebar

    } catch (error: any) {
      console.error('AI action error:', error);
      toast.error(`Error: ${error.message || 'Failed to process AI request'}`);
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 border-b border-purple-700 px-4 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-purple-200 mr-2">✨ AI EDITING:</span>
        
        <button
          onClick={() => handleAIAction('rewrite')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Rewrite selected text"
        >
          {loading && currentAction === 'rewrite' ? '⏳ Rewriting...' : '✍️ Rewrite'}
        </button>

        <button
          onClick={() => handleAIAction('summarize')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Summarize selected text"
        >
          {loading && currentAction === 'summarize' ? '⏳ Summarizing...' : '📝 Summarize'}
        </button>

        <button
          onClick={() => handleAIAction('expand')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Expand selected text"
        >
          {loading && currentAction === 'expand' ? '⏳ Expanding...' : '📈 Expand'}
        </button>

        <button
          onClick={() => handleAIAction('shorten')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Shorten selected text"
        >
          {loading && currentAction === 'shorten' ? '⏳ Shortening...' : '📉 Shorten'}
        </button>

        <button
          onClick={() => handleAIAction('improve')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-pink-600 text-white rounded hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Improve writing quality"
        >
          {loading && currentAction === 'improve' ? '⏳ Improving...' : '⭐ Improve Writing'}
        </button>

        <button
          onClick={() => handleAIAction('continue')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Continue writing from here"
        >
          {loading && currentAction === 'continue' ? '⏳ Writing...' : '➡️ Continue Writing'}
        </button>

        <button
          onClick={() => handleAIAction('explain')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Explain selected text"
        >
          {loading && currentAction === 'explain' ? '⏳ Explaining...' : '💡 Explain'}
        </button>

        {loading && (
          <span className="ml-auto text-xs text-purple-200 animate-pulse">
            🤔 Thinking...
          </span>
        )}

        {!currentModel && (
          <span className="ml-auto text-xs text-yellow-300">
            ⚠️ Select a model from sidebar
          </span>
        )}
      </div>
    </div>
  );
};


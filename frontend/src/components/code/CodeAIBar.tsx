/**
 * Code AI Bar - AI Actions for Code Editing
 * 
 * Provides AI-powered code actions: rewrite, fix, comment, refactor, etc.
 * Works with Monaco Editor
 */

import { useState } from 'react';
import type { MutableRefObject } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { runModel } from '../../api';
import { useAppState } from '../../store/appState';
import { callGlobalHandler } from '../../utils/globalHandlers';
import toast from 'react-hot-toast';

interface CodeAIBarProps {
  editorRef: MutableRefObject<MonacoEditor.IStandaloneCodeEditor | null>;
  currentModel: string;
}

type AIAction = 'rewrite_code' | 'fix_errors' | 'add_comments' | 'refactor' | 'summarize' | 'optimize' | 'continue' | 'explain';

const AI_PROMPTS: Record<AIAction, string> = {
  rewrite_code: `Rewrite the following code to be cleaner and more readable.
Return ONLY the rewritten code, no explanations.

CODE:
\`\`\`
{{code}}
\`\`\``,

  fix_errors: `Fix any bugs, errors, or issues in the following code.
Return ONLY the fixed code, no explanations.

CODE:
\`\`\`
{{code}}
\`\`\``,

  add_comments: `Add clear, helpful comments to the following code.
Return ONLY the code with comments added, no other text.

CODE:
\`\`\`
{{code}}
\`\`\``,

  refactor: `Refactor the following code to improve structure, readability, and maintainability.
Return ONLY the refactored code, no explanations.

CODE:
\`\`\`
{{code}}
\`\`\``,

  summarize: `Summarize what the following code does in 2-3 sentences.
Return ONLY the summary as plain text.

CODE:
\`\`\`
{{code}}
\`\`\``,

  optimize: `Optimize the following code for better performance and efficiency.
Return ONLY the optimized code, no explanations.

CODE:
\`\`\`
{{code}}
\`\`\``,

  continue: `Continue the following code naturally and logically.
Return ONLY the continuation code, not the original.

CODE:
\`\`\`
{{code}}
\`\`\``,

  explain: `Explain how the following code works in clear, simple terms.
Return ONLY the explanation as plain text.

CODE:
\`\`\`
{{code}}
\`\`\``
};

export const CodeAIBar = ({ editorRef, currentModel }: CodeAIBarProps) => {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const { addAIResponse } = useAppState();

  const handleAIAction = async (action: AIAction) => {
    const editor = editorRef.current;
    
    if (!editor || !currentModel) {
      toast('Please select a model from the sidebar first', { icon: '⚠️' });
      return;
    }

    try {
      setLoading(true);
      setCurrentAction(action);

      // Auto-open AI Panel sidebar
      callGlobalHandler('codeAIPanel');

      // Get selected code or entire file
      const selection = editor.getSelection();
      const hasSelection = selection ? !selection.isEmpty() : false;
      
      let codeToProcess: string;
      const model = editor.getModel();
      if (hasSelection && selection && model) {
        codeToProcess = model.getValueInRange(selection);
      } else {
        codeToProcess = editor.getValue();
      }

      if (!codeToProcess.trim()) {
        toast('No code to process', { icon: '⚠️' });
        return;
      }

      // Build prompt
      const prompt = AI_PROMPTS[action].replace('{{code}}', codeToProcess);

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
        cleanedResponse = lines.join('\n').trim();
      }

      // Send response to AI Panel - ONLY update sidebar, NOT the editor
      const actionLabel = action.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      const codePreview = codeToProcess.length > 100 
        ? codeToProcess.substring(0, 100) + '...' 
        : codeToProcess;
      
      // Add to store (persists when sidebar closes)
      addAIResponse(actionLabel, cleanedResponse, codePreview);

      // DO NOT modify the editor automatically
      // User must explicitly click Insert/Replace/Replace All in the sidebar

    } catch (error: unknown) {
      console.error('AI action error:', error);
      const message = error instanceof Error ? error.message : 'Failed to process AI request';
      toast.error(`Error: ${message}`);
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 border-b border-purple-700 px-4 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-purple-200 mr-2">🤖 AI CODE:</span>
        
        <button
          onClick={() => handleAIAction('rewrite_code')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Rewrite selected code"
        >
          {loading && currentAction === 'rewrite_code' ? '⏳ Rewriting...' : '✍️ Rewrite'}
        </button>

        <button
          onClick={() => handleAIAction('fix_errors')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Fix errors in selected code"
        >
          {loading && currentAction === 'fix_errors' ? '⏳ Fixing...' : '🔧 Fix Errors'}
        </button>

        <button
          onClick={() => handleAIAction('add_comments')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Add comments to code"
        >
          {loading && currentAction === 'add_comments' ? '⏳ Adding...' : '💬 Add Comments'}
        </button>

        <button
          onClick={() => handleAIAction('refactor')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Refactor selected code"
        >
          {loading && currentAction === 'refactor' ? '⏳ Refactoring...' : '♻️ Refactor'}
        </button>

        <button
          onClick={() => handleAIAction('summarize')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Summarize what code does"
        >
          {loading && currentAction === 'summarize' ? '⏳ Summarizing...' : '📝 Summarize'}
        </button>

        <button
          onClick={() => handleAIAction('optimize')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Optimize code performance"
        >
          {loading && currentAction === 'optimize' ? '⏳ Optimizing...' : '⚡ Optimize'}
        </button>

        <button
          onClick={() => handleAIAction('continue')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Continue code from here"
        >
          {loading && currentAction === 'continue' ? '⏳ Writing...' : '➡️ Continue'}
        </button>

        <button
          onClick={() => handleAIAction('explain')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Explain selected code"
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

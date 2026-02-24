import { useState } from 'react';
import { runModel } from '../../api';
import { useAppState } from '../../store/appState';
import { tableToString, getColumn } from '../../utils/sheetUtils';
import { callGlobalHandler } from '../../utils/globalHandlers';
import toast from 'react-hot-toast';

interface SheetAIBarProps {
  currentModel: string;
  rows: string[][];
}

type AIAction = 'summarize' | 'clean' | 'generate_column' | 'explain_column' | 'improve';

const AI_PROMPTS: Record<AIAction, (data: string) => string> = {
  summarize: (table) => `Summarize the following table and its important patterns.

TABLE:
${table}

Return a clear summary of the data.`,

  clean: (table) => `Clean the inconsistencies in this table. Return a cleaned version in the same CSV format.

TABLE:
${table}

Return ONLY the cleaned table, no explanations.`,

  generate_column: (table) => `Generate a new column for this table. The column should add useful derived information.

TABLE:
${table}

Return only the new column values, one per line.`,

  explain_column: (column) => `Explain what the following column means and how it behaves:

COLUMN:
${column}

Provide a clear explanation.`,

  improve: (table) => `Improve the organization or clarity of the following table.

TABLE:
${table}

Return the improved table in CSV format.`,
};

export const SheetAIBar = ({ currentModel, rows }: SheetAIBarProps) => {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [columnInput, setColumnInput] = useState('');
  const [showColumnInput, setShowColumnInput] = useState(false);
  const { addAIResponse } = useAppState();

  const handleAIAction = async (action: AIAction, customData?: string) => {
    if (!currentModel) {
      toast('Please select a model from the sidebar first', { icon: '⚠️' });
      return;
    }

    if (rows.length === 0) {
      toast('No data in sheet', { icon: '⚠️' });
      return;
    }

    try {
      setLoading(true);
      setCurrentAction(action);

      // Auto-open sidebar to AI Assistant tab
      callGlobalHandler('documentSidebar');

      // Prepare data
      let dataToProcess: string;
      if (action === 'explain_column' && customData) {
        dataToProcess = customData;
      } else {
        dataToProcess = tableToString(rows);
      }

      // Build prompt
      const prompt = AI_PROMPTS[action](dataToProcess);

      // Call AI
      const response = await runModel(currentModel, prompt);

      // Clean up response
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```')) {
        const lines = cleanedResponse.split('\n');
        lines.shift();
        if (lines[lines.length - 1].trim() === '```') {
          lines.pop();
        }
        cleanedResponse = lines.join('\n');
      }

      // Add to store (sidebar only, don't modify sheet)
      const actionLabel = action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const promptPreview = `${actionLabel} on ${rows.length} rows`;
      
      addAIResponse(actionLabel, cleanedResponse, promptPreview);

      // DO NOT modify the sheet automatically
      // User must explicitly click Insert/Replace actions in sidebar

    } catch (error: unknown) {
      console.error('AI action error:', error);
      const message = error instanceof Error ? error.message : 'Failed to process AI request';
      toast.error(`Error: ${message}`);
    } finally {
      setLoading(false);
      setCurrentAction('');
      setShowColumnInput(false);
      setColumnInput('');
    }
  };

  const handleExplainColumn = () => {
    if (!columnInput.trim()) {
      toast('Please enter a column number (e.g., 0 for first column)', { icon: '⚠️' });
      return;
    }

    const columnIndex = parseInt(columnInput);
    if (isNaN(columnIndex) || columnIndex < 0 || columnIndex >= (rows[0]?.length || 0)) {
      toast('Invalid column number', { icon: '⚠️' });
      return;
    }

    const columnData = getColumn(rows, columnIndex);
    const columnString = columnData.join('\n');
    handleAIAction('explain_column', columnString);
  };

  return (
    <div className="bg-gradient-to-r from-green-900 to-teal-900 border-b border-green-700 px-4 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-green-200 mr-2">📊 SHEET AI:</span>
        
        <button
          onClick={() => handleAIAction('summarize')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Summarize table data"
        >
          {loading && currentAction === 'summarize' ? '⏳ Summarizing...' : '📝 Summarize'}
        </button>

        <button
          onClick={() => handleAIAction('clean')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Clean data inconsistencies"
        >
          {loading && currentAction === 'clean' ? '⏳ Cleaning...' : '🧹 Clean Data'}
        </button>

        <button
          onClick={() => handleAIAction('generate_column')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Generate new column"
        >
          {loading && currentAction === 'generate_column' ? '⏳ Generating...' : '➕ Generate Column'}
        </button>

        <button
          onClick={() => setShowColumnInput(!showColumnInput)}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Explain a column"
        >
          💡 Explain Column
        </button>

        <button
          onClick={() => handleAIAction('improve')}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-pink-600 text-white rounded hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Improve table organization"
        >
          {loading && currentAction === 'improve' ? '⏳ Improving...' : '⭐ Improve Table'}
        </button>

        {loading && (
          <span className="ml-auto text-xs text-green-200 animate-pulse">
            🤔 Thinking...
          </span>
        )}

        {!currentModel && (
          <span className="ml-auto text-xs text-yellow-300">
            ⚠️ Select a model from sidebar
          </span>
        )}
      </div>

      {/* Column input for Explain Column action */}
      {showColumnInput && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={columnInput}
            onChange={(e) => setColumnInput(e.target.value)}
            placeholder="Column number (0, 1, 2...)"
            className="px-3 py-1.5 text-sm border border-green-600 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            onClick={handleExplainColumn}
            className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
          >
            Explain
          </button>
          <button
            onClick={() => setShowColumnInput(false)}
            className="px-2 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

import type { Editor } from '@tiptap/react';
import { useAppState } from '../../store/appState';
import toast from 'react-hot-toast';

interface AIPanelProps {
  editor: Editor | null;
}

export const AIPanel = ({ editor }: AIPanelProps) => {
  const { aiResponses, deleteAIResponse } = useAppState();

  const handleInsertAtCursor = (text: string) => {
    if (!editor) {
      // For sheets mode, copy to clipboard as fallback
      navigator.clipboard.writeText(text);
      toast('Copied to clipboard!', { icon: '📋' });
      return;
    }
    editor.chain().focus().insertContent(text).run();
  };

  const handleReplaceSelection = (text: string) => {
    if (!editor) {
      // For sheets mode, copy to clipboard as fallback
      navigator.clipboard.writeText(text);
      toast('Copied to clipboard!', { icon: '📋' });
      return;
    }
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    
    if (hasSelection) {
      editor.chain().focus().deleteSelection().insertContent(text).run();
    } else {
      // No selection, just insert at cursor
      editor.chain().focus().insertContent(text).run();
    }
  };

  const handleReplaceDocument = (text: string) => {
    if (!editor) {
      // For sheets mode, copy to clipboard as fallback
      navigator.clipboard.writeText(text);
      toast('Copied to clipboard!', { icon: '📋' });
      return;
    }
    editor.commands.setContent(text);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    });
  };

  const handleDelete = (id: string) => {
    deleteAIResponse(id);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-gray-900 text-sm">AI Responses</h3>
        <p className="text-xs text-gray-500 mt-1">
          AI-generated content appears here
        </p>
      </div>

      {/* Responses list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {aiResponses.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="text-4xl mb-2">🤖</div>
            <div className="text-sm">No AI responses yet</div>
            <div className="text-xs mt-1">
              Use AI editing buttons to generate content
            </div>
          </div>
        ) : (
          aiResponses.map((response) => (
            <div
              key={response.id}
              className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
            >
              {/* Response type badge */}
              <div className="mb-2">
                <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded">
                  {response.type}
                </span>
              </div>

              {/* Response content */}
              <div className="text-xs text-gray-700 mb-3 whitespace-pre-wrap max-h-40 overflow-y-auto border border-gray-100 rounded p-2 bg-gray-50">
                {response.content}
              </div>

              {/* Original prompt preview */}
              {response.prompt && (
                <div className="text-xs text-gray-400 mb-2 italic">
                  From: "{response.prompt}"
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-400 mb-2">
                {response.timestamp.toLocaleTimeString()}
              </div>

              {/* Action buttons */}
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => handleInsertAtCursor(response.content)}
                  className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  title="Insert at cursor position"
                >
                  ➕ Insert
                </button>
                <button
                  onClick={() => handleReplaceSelection(response.content)}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  title="Replace selected text"
                >
                  🔄 Replace
                </button>
                <button
                  onClick={() => handleReplaceDocument(response.content)}
                  className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                  title="Replace entire document"
                >
                  📄 Replace All
                </button>
                <button
                  onClick={() => handleCopy(response.content)}
                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => handleDelete(response.id)}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  title="Delete this response"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};


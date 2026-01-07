/**
 * Results Panel - Display tool execution results
 * 
 * Shows AI-generated analysis with copy and save options
 */

import { useToolsStore } from '../../store/useToolsStore';
import toast from 'react-hot-toast';

export const ResultsPanel = () => {
  const { currentTool, result, loading, error, clearResult } = useToolsStore();
  
  const handleCopy = () => {
    if (!result) return;
    
    navigator.clipboard.writeText(result).then(() => {
      toast.success('Result copied to clipboard');
    });
  };
  
  const handleSaveAsFile = () => {
    if (!result || !currentTool) return;
    
    // Determine filename based on tool
    let filename = 'result.txt';
    if (currentTool === 'generate_readme') {
      filename = 'README.md';
    } else if (currentTool === 'scan_todos') {
      filename = 'todos.txt';
    } else if (currentTool === 'analyze_codebase') {
      filename = 'codebase-analysis.txt';
    } else {
      filename = `${currentTool}-result.txt`;
    }
    
    // Create blob and download
    const blob = new Blob([result], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Saved as ${filename}`);
  };
  
  const getToolDisplayName = (toolName: string | null): string => {
    if (!toolName) return 'Tool Result';
    
    const names: Record<string, string> = {
      'summarize_workspace': 'Workspace Summary',
      'list_files': 'File List',
      'scan_todos': 'TODO Scan',
      'analyze_codebase': 'Codebase Analysis',
      'generate_readme': 'README Generator',
      'summarize_csv': 'CSV Summary'
    };
    
    return names[toolName] || toolName;
  };
  
  if (!currentTool && !result && !loading && !error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">🛠️</div>
          <div className="text-xl font-semibold">Select a Tool</div>
          <div className="text-sm mt-2">Choose a tool from the left to begin analysis</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">
            {getToolDisplayName(currentTool)}
          </h3>
          {currentTool && (
            <p className="text-xs text-gray-500 mt-0.5">
              AI-powered analysis
            </p>
          )}
        </div>
        
        {result && (
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              title="Copy result to clipboard"
            >
              📋 Copy
            </button>
            <button
              onClick={handleSaveAsFile}
              className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              title="Save result as file"
            >
              💾 Save as File
            </button>
            <button
              onClick={clearResult}
              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              title="Clear result"
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">⚙️</div>
              <div className="text-gray-600 font-semibold">
                Running {getToolDisplayName(currentTool)}...
              </div>
              <div className="text-sm text-gray-500 mt-2">
                This may take a moment
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 font-semibold mb-2">⚠️ Error</div>
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}
        
        {result && !loading && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};


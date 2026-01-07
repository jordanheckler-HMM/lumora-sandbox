/**
 * Tools Tab - AI-powered workspace analysis tools
 * 
 * Provides safe, read-only tools for analyzing the workspace
 */

import { useToolsStore } from '../../store/useToolsStore';
import { useAppState } from '../../store/appState';
import { ResultsPanel } from './ResultsPanel';
import toast from 'react-hot-toast';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiresSheet?: boolean;
}

const TOOLS: Tool[] = [
  {
    id: 'summarize_workspace',
    name: 'Summarize Workspace',
    description: 'Get an AI summary of your project structure',
    icon: '📊'
  },
  {
    id: 'list_files',
    name: 'List All Files',
    description: 'Organized list of all files by type',
    icon: '📁'
  },
  {
    id: 'scan_todos',
    name: 'Scan for TODOs',
    description: 'Find all TODO and FIXME comments',
    icon: '✅'
  },
  {
    id: 'analyze_codebase',
    name: 'Analyze Codebase',
    description: 'Architecture and code quality analysis',
    icon: '🔍'
  },
  {
    id: 'generate_readme',
    name: 'Generate README',
    description: 'Create a README.md draft for your project',
    icon: '📝'
  },
  {
    id: 'summarize_csv',
    name: 'Summarize Active CSV',
    description: 'Analyze the CSV loaded in Sheets tab',
    icon: '📈',
    requiresSheet: true
  }
];

export const ToolsTab = () => {
  const { workspacePath, selectedModel, sheetState } = useAppState();
  const { runTool, loading } = useToolsStore();
  
  const handleRunTool = async (toolId: string, requiresSheet: boolean) => {
    if (!workspacePath) {
      toast('Please set a workspace path first in the Workspace tab', { icon: '⚠️' });
      return;
    }
    
    if (!selectedModel) {
      toast('Please select a model from the sidebar', { icon: '⚠️' });
      return;
    }
    
    // Check if sheet data is required and available
    if (requiresSheet) {
      if (!sheetState.columns || sheetState.columns.length === 0) {
        toast('Please load a CSV file in the Sheets tab first', { icon: '⚠️' });
        return;
      }
      
      // Pass sheet data for CSV analysis
      await runTool(toolId, workspacePath, selectedModel, {
        name: sheetState.name,
        columns: sheetState.columns,
        rows: sheetState.rows
      });
    } else {
      await runTool(toolId, workspacePath, selectedModel);
    }
  };
  
  return (
    <div className="flex h-full bg-gray-50">
      {/* Tools List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span>🛠️</span>
            <span>Workspace Tools</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            AI-powered analysis tools
          </p>
        </div>
        
        {/* Status Info */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${workspacePath ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-gray-600">
                Workspace: {workspacePath ? '✓ Set' : '✗ Not set'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${selectedModel ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-gray-600">
                Model: {selectedModel || '✗ Not selected'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Tools List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleRunTool(tool.id, tool.requiresSheet || false)}
              disabled={loading}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{tool.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800 mb-1">
                    {tool.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {tool.description}
                  </div>
                  {tool.requiresSheet && (
                    <div className="text-xs text-purple-600 mt-1">
                      Requires active CSV
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Results Panel */}
      <ResultsPanel />
    </div>
  );
};


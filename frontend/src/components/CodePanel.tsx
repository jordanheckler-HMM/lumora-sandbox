import { Editor } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { useAppState } from '../store/appState';
import { writeFile } from '../api';
import { useState, useRef, useEffect } from 'react';
import { CodeAIBar } from './code/CodeAIBar';
import { CodeAIPanel } from './code/CodeAIPanel';
import { registerGlobalHandler, unregisterGlobalHandler } from '../utils/globalHandlers';

export const CodePanel = () => {
  // Phase 1: Use global app state - code content persists across tab switches
  const { codeFileContent, openCodeFile, setCodeFileContent, addToolOutput, selectedModel } = useAppState();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [aiPanelOpen, setAIPanelOpen] = useState(false);
  
  // Monaco editor ref for AI actions
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  
  // Register global handler for AI panel
  useEffect(() => {
    registerGlobalHandler('codeAIPanel', () => setAIPanelOpen(true));
    return () => unregisterGlobalHandler('codeAIPanel');
  }, []);

  const handleSave = async () => {
    if (!openCodeFile) {
      setSaveStatus('No file opened');
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }

    try {
      setSaving(true);
      setSaveStatus(null);
      const result = await writeFile(openCodeFile, codeFileContent);
      addToolOutput({
        type: 'write',
        data: result,
      });
      setSaveStatus('✓ Saved successfully');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save file';
      setSaveStatus(`✗ Error: ${message}`);
      setTimeout(() => setSaveStatus(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorMount = (editor: MonacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const handleToggleAIPanel = () => {
    setAIPanelOpen(prev => !prev);
  };

  return (
    <div className="flex h-full bg-gray-50 relative">
      {/* Main code editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-gray-700">
              {openCodeFile || 'No file opened'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus && (
              <div
                className={`text-sm ${
                  saveStatus.startsWith('✓') ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {saveStatus}
              </div>
            )}
            <button
              onClick={handleToggleAIPanel}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                aiPanelOpen
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title="Toggle AI Panel"
            >
              🤖 AI Panel
            </button>
            <button
              onClick={handleSave}
              disabled={!openCodeFile || saving}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save File'}
            </button>
          </div>
        </div>

        {/* AI Editing Bar */}
        <CodeAIBar editorRef={editorRef} currentModel={selectedModel} />

        {/* Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="typescript"
            value={codeFileContent}
            onChange={(value) => setCodeFileContent(value || '')}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
            }}
          />
        </div>
      </div>

      {/* Right AI Panel */}
      {aiPanelOpen && (
        <div className="w-96 border-l border-gray-300 bg-gray-50">
          <CodeAIPanel editorRef={editorRef} />
        </div>
      )}
    </div>
  );
};

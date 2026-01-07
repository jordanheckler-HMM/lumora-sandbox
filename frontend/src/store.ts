import { create } from 'zustand';
import type { Message, FileNode } from './api';

export interface ToolOutput {
  id: string;
  timestamp: Date;
  type: 'read' | 'write' | 'search';
  data: any;
}

interface AppState {
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  activeTab: 'chat' | 'code' | 'tools' | 'workspace' | 'documents' | 'sheets';
  setActiveTab: (tab: 'chat' | 'code' | 'tools' | 'workspace' | 'documents' | 'sheets') => void;

  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;

  editorContent: string;
  editorPath: string;
  setEditorContent: (content: string, path?: string) => void;

  toolOutputs: ToolOutput[];
  addToolOutput: (output: Omit<ToolOutput, 'id' | 'timestamp'>) => void;

  workspaceTree: FileNode | null;
  setWorkspaceTree: (tree: FileNode) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // AI responses for Documents tab
  aiResponses: Array<{
    id: string;
    type: string;
    content: string;
    prompt: string;
    timestamp: Date;
  }>;
  addAIResponse: (type: string, content: string, prompt: string) => void;
  deleteAIResponse: (id: string) => void;
  clearAIResponses: () => void;
}

export const useStore = create<AppState>((set) => ({
  selectedModel: '',
  setSelectedModel: (model) => set({ selectedModel: model }),

  activeTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),

  messages: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),

  editorContent: '// Welcome to LUMORA Sandbox\n// Select a file from the Workspace tab to edit',
  editorPath: '',
  setEditorContent: (content, path = '') => set({ editorContent: content, editorPath: path }),

  toolOutputs: [],
  addToolOutput: (output) => set((state) => ({
    toolOutputs: [
      ...state.toolOutputs,
      { ...output, id: Date.now().toString(), timestamp: new Date() }
    ]
  })),

  workspaceTree: null,
  setWorkspaceTree: (tree) => set({ workspaceTree: tree }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // AI responses for Documents tab
  aiResponses: [],
  addAIResponse: (type, content, prompt) => set((state) => ({
    aiResponses: [
      {
        id: Date.now().toString() + Math.random(),
        type,
        content,
        prompt,
        timestamp: new Date(),
      },
      ...state.aiResponses,
    ]
  })),
  deleteAIResponse: (id) => set((state) => ({
    aiResponses: state.aiResponses.filter(r => r.id !== id)
  })),
  clearAIResponses: () => set({ aiResponses: [] }),
}));


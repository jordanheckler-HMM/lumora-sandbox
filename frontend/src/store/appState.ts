/**
 * LUMORA Sandbox - Unified Global App State
 * Phase 1: Stabilization - All tab state is now global to prevent resets when switching tabs
 */

import { create } from 'zustand';
import type { Message, FileNode } from '../api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ToolOutput {
  id: string;
  timestamp: Date;
  type: 'read' | 'write' | 'search';
  data: any;
}

export interface AIResponse {
  id: string;
  type: string;
  content: string;
  prompt: string;
  timestamp: Date;
}

export interface DocumentState {
  title: string;
  content: string;
  isModified: boolean;
}

export interface SheetState {
  name: string;
  columns: string[];
  rows: string[][];
  isModified: boolean;
}

export interface SidebarState {
  documentsTabOpen: boolean;
  documentSidebarTab: string;
  sheetsTabOpen: boolean;
  sheetSidebarTab: string;
}

export type TabType = 'chat' | 'code' | 'tools' | 'workspace' | 'documents' | 'sheets';

// ============================================================================
// APP STATE INTERFACE
// ============================================================================

interface AppState {
  // Navigation & UI
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Model Selection
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // Workspace State
  workspacePath: string;
  setWorkspacePath: (path: string) => void;
  workspaceTree: FileNode | null;
  setWorkspaceTree: (tree: FileNode) => void;
  expandedDirs: Set<string>;
  setExpandedDirs: (dirs: Set<string>) => void;

  // Code Editor State
  openCodeFile: string | null;
  setOpenCodeFile: (path: string | null) => void;
  codeFileContent: string;
  setCodeFileContent: (content: string) => void;

  // Document Tab State
  documentState: DocumentState;
  setDocumentState: (state: Partial<DocumentState>) => void;

  // Sheets Tab State
  sheetState: SheetState;
  setSheetState: (state: Partial<SheetState>) => void;

  // Sidebar State (for Documents & Sheets)
  sidebarState: SidebarState;
  setSidebarState: (state: Partial<SidebarState>) => void;

  // Chat State
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;

  // Tools State
  toolOutputs: ToolOutput[];
  addToolOutput: (output: Omit<ToolOutput, 'id' | 'timestamp'>) => void;

  // AI Responses (for Documents AI Panel)
  aiResponses: AIResponse[];
  addAIResponse: (type: string, content: string, prompt: string) => void;
  deleteAIResponse: (id: string) => void;
  clearAIResponses: () => void;

  // Global Loading State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useAppState = create<AppState>((set) => ({
  // Navigation & UI
  activeTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Model Selection
  selectedModel: '',
  setSelectedModel: (model) => set({ selectedModel: model }),

  // Workspace State
  workspacePath: typeof window !== 'undefined' 
    ? (localStorage.getItem('lumora_last_workspace') || '')
    : '',
  setWorkspacePath: (path) => set({ workspacePath: path }),
  workspaceTree: null,
  setWorkspaceTree: (tree) => set({ workspaceTree: tree }),
  expandedDirs: new Set<string>(),
  setExpandedDirs: (dirs) => set({ expandedDirs: dirs }),

  // Code Editor State
  openCodeFile: null,
  setOpenCodeFile: (path) => set({ 
    openCodeFile: path,
  }),
  codeFileContent: '// Welcome to LUMORA Sandbox\n// Select a file from the Workspace tab to edit',
  setCodeFileContent: (content) => set({ 
    codeFileContent: content,
  }),

  // Document Tab State
  documentState: {
    title: 'Untitled Document',
    content: '',
    isModified: false,
  },
  setDocumentState: (newState) => set((state) => ({
    documentState: { ...state.documentState, ...newState },
  })),

  // Sheets Tab State
  sheetState: {
    name: '',
    columns: [],
    rows: [],
    isModified: false,
  },
  setSheetState: (newState) => set((state) => ({
    sheetState: { ...state.sheetState, ...newState },
  })),

  // Sidebar State
  sidebarState: {
    documentsTabOpen: false,
    documentSidebarTab: 'ai',
    sheetsTabOpen: false,
    sheetSidebarTab: 'ai',
  },
  setSidebarState: (newState) => set((state) => ({
    sidebarState: { ...state.sidebarState, ...newState },
  })),

  // Chat State
  messages: [],
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message],
  })),
  clearMessages: () => set({ messages: [] }),

  // Tools State
  toolOutputs: [],
  addToolOutput: (output) => set((state) => ({
    toolOutputs: [
      ...state.toolOutputs,
      { 
        ...output, 
        id: Date.now().toString() + Math.random(), 
        timestamp: new Date(),
      },
    ],
  })),

  // AI Responses
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
    ],
  })),
  deleteAIResponse: (id) => set((state) => ({
    aiResponses: state.aiResponses.filter((r) => r.id !== id),
  })),
  clearAIResponses: () => set({ aiResponses: [] }),

  // Global Loading State
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));

// ============================================================================
// BACKWARDS COMPATIBILITY EXPORT
// ============================================================================

// Re-export as useStore for backwards compatibility
export const useStore = useAppState;


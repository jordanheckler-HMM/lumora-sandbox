/**
 * Tools Store - LUMORA Tools Tab
 * 
 * Manages AI-powered workspace analysis tools
 */

import { create } from 'zustand';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ToolResult {
  tool: string;
  result: string;
  timestamp: number;
}

interface ToolsState {
  currentTool: string | null;
  result: string | null;
  loading: boolean;
  error: string | null;
  
  runTool: (toolName: string, workspacePath: string, model: string, activeSheetData?: unknown) => Promise<void>;
  clearResult: () => void;
}

export const useToolsStore = create<ToolsState>((set) => ({
  currentTool: null,
  result: null,
  loading: false,
  error: null,
  
  runTool: async (toolName: string, workspacePath: string, model: string, activeSheetData?: unknown) => {
    if (!workspacePath) {
      set({ error: 'Workspace path is required' });
      return;
    }
    
    if (!model) {
      set({ error: 'Model is required' });
      return;
    }
    
    set({ loading: true, error: null, currentTool: toolName, result: null });
    
    try {
      const response = await axios.post(`${API_BASE}/api/tools/run`, {
        toolName,
        workspacePath,
        model,
        activeSheetData
      });
      
      if (response.data.success) {
        set({
          result: response.data.result,
          loading: false,
          error: null
        });
      } else {
        set({
          error: 'Tool execution failed',
          loading: false,
          result: null
        });
      }
    } catch (error: unknown) {
      console.error('Tool execution error:', error);
      let errorMessage = 'Failed to run tool';

      if (axios.isAxiosError(error)) {
        const detail = error.response?.data;
        if (detail && typeof detail === 'object' && 'detail' in detail && typeof detail.detail === 'string') {
          errorMessage = detail.detail;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      set({
        error: errorMessage,
        loading: false,
        result: null
      });
    }
  },
  
  clearResult: () => {
    set({ currentTool: null, result: null, error: null });
  }
}));

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }
    if (error.response?.data?.detail) {
      return Promise.reject(new Error(error.response.data.detail));
    }
    return Promise.reject(error);
  }
);

export interface Model {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;        // Model that generated this message
  timestamp: number;    // Date.now() when message was created
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export const fetchModels = async (): Promise<Model[]> => {
  const response = await api.get('/models');
  return response.data.models;
};

export const runModel = async (model: string, prompt: string): Promise<string> => {
  const response = await api.post('/run-model', { model, prompt }, {
    timeout: 120000, // 2 minutes for AI responses
  });
  return response.data.response;
};

export const chatWithModel = async (model: string, messages: Message[]): Promise<string> => {
  // Convert to Ollama chat format (only role and content)
  const chatMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  const response = await api.post('/chat', { 
    model, 
    messages: chatMessages 
  }, {
    timeout: 120000, // 2 minutes for AI responses
  });
  return response.data.response;
};

export const chatWithModelStreaming = async (
  model: string,
  messages: Message[],
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: string) => void,
  abortSignal?: AbortSignal
): Promise<void> => {
  // Convert to Ollama chat format (only role and content)
  const chatMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  try {
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: chatMessages
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is null');
    }

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete();
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
            
            if (parsed.content) {
              onChunk(parsed.content);
            }
            
            if (parsed.done) {
              onComplete();
              return;
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }
  } catch (error: any) {
    // Check if it was an abort
    if (error.name === 'AbortError') {
      onError('Generation stopped by user');
    } else {
      onError(error.message || 'Streaming error occurred');
    }
  }
};

export const readFile = async (path: string): Promise<{ path: string; content: string; size: number }> => {
  const response = await api.post('/tools/read_file', { path });
  return response.data;
};

export const writeFile = async (path: string, content: string): Promise<{ path: string; success: boolean; size: number }> => {
  const response = await api.post('/tools/write_file', { path, content });
  return response.data;
};

export const searchFiles = async (root: string, query: string): Promise<{ query: string; root: string; matches: string[] }> => {
  const response = await api.post('/tools/search', { root, query });
  return response.data;
};

export const getWorkspaceFiles = async (path: string = '.'): Promise<FileNode> => {
  const response = await api.get(`/workspace/files?path=${encodeURIComponent(path)}`);
  return response.data;
};

export interface CSVData {
  filename: string;
  columns: string[];
  rows: string[][];
  row_count: number;
  column_count: number;
}

export const parseCSV = async (file: File): Promise<CSVData> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_BASE_URL}/sheets/parse-csv`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

// ============================================================================
// CHAT SESSION API
// ============================================================================

export interface ChatSessionMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatSessionFull {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export const listChatSessions = async (): Promise<ChatSessionMetadata[]> => {
  const response = await api.get('/chats/list');
  return response.data.sessions;
};

export const getChatSession = async (chatId: string): Promise<ChatSessionFull> => {
  const response = await api.get(`/chats/${chatId}`);
  return response.data;
};

export const saveChatSession = async (
  id: string,
  title: string,
  messages: Message[]
): Promise<{ success: boolean; id: string; createdAt: number; updatedAt: number }> => {
  const response = await api.post('/chats/save', { id, title, messages });
  return response.data;
};

export const deleteChatSession = async (chatId: string): Promise<{ success: boolean }> => {
  const response = await api.delete(`/chats/${chatId}`);
  return response.data;
};


/**
 * Chat Sessions Store - Multi-Chat Management
 * 
 * Manages multiple chat sessions stored as JSON files on the backend.
 * Each chat session has its own message history.
 */

import { create } from 'zustand';
import { listChatSessions, getChatSession, saveChatSession, deleteChatSession } from '../api';
import type { ChatSessionMetadata, Message } from '../api';

interface ChatSessionsState {
  // All available chat sessions
  sessions: ChatSessionMetadata[];
  
  // Currently active session ID
  activeSessionId: string | null;
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  loadSessions: () => Promise<void>;
  createNewSession: () => Promise<string>;
  loadSessionMessages: (sessionId: string) => Promise<Message[]>;
  saveCurrentSession: (sessionId: string, title: string, messages: Message[]) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  setActiveSessionId: (id: string | null) => void;
  updateSessionTitle: (id: string, title: string) => void;
}

export const useChatSessions = create<ChatSessionsState>((set) => ({
  sessions: [],
  activeSessionId: null,
  isLoading: false,

  loadSessions: async () => {
    set({ isLoading: true });
    try {
      const sessions = await listChatSessions();
      set({ sessions, isLoading: false });
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      set({ sessions: [], isLoading: false });
    }
  },

  createNewSession: async () => {
    // Generate new session ID
    const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    
    // Create empty session on backend
    try {
      await saveChatSession(sessionId, 'New Chat', []);
      
      // Add to sessions list
      const newSession: ChatSessionMetadata = {
        id: sessionId,
        title: 'New Chat',
        createdAt: now,
        updatedAt: now,
      };
      
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: sessionId,
      }));
      
      return sessionId;
    } catch (error) {
      console.error('Failed to create new session:', error);
      throw error;
    }
  },

  loadSessionMessages: async (sessionId: string) => {
    try {
      const session = await getChatSession(sessionId);
      return session.messages;
    } catch (error) {
      console.error('Failed to load session messages:', error);
      return [];
    }
  },

  saveCurrentSession: async (sessionId: string, title: string, messages: Message[]) => {
    try {
      const result = await saveChatSession(sessionId, title, messages);
      
      // Update session metadata in store
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === sessionId
            ? { ...session, title, updatedAt: result.updatedAt }
            : session
        ),
      }));
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId);
      
      // Remove from sessions list
      set((state) => ({
        sessions: state.sessions.filter((session) => session.id !== sessionId),
      }));
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  },

  setActiveSessionId: (id: string | null) => {
    set({ activeSessionId: id });
    
    // Store in localStorage for persistence across refresh
    if (id) {
      localStorage.setItem('activeSessionId', id);
    } else {
      localStorage.removeItem('activeSessionId');
    }
  },

  updateSessionTitle: (id: string, title: string) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { ...session, title } : session
      ),
    }));
  },
}));


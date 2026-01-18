import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../store/appState';
import { useChatSessions } from '../store/chatSessionsStore';
import { chatWithModelStreaming } from '../api';
import type { Message } from '../api';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';

/**
 * Format timestamp as "5:32 PM" or "11/30/2025, 5:32 PM" if not today
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } else {
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
};

/**
 * Confirmation Modal Component
 */
const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Input Modal Component
 */
const InputModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  label,
  defaultValue,
  placeholder
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (value: string) => void; 
  title: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) => {
  const [value, setValue] = useState(defaultValue || '');

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue || '');
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (value.trim()) {
      onConfirm(value.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          autoFocus
        />
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Component to render streaming markdown content in real-time
 */
const StreamingMessage = ({ content, model }: { content: string; model: string }) => {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
  
  const rawHtml = marked.parse(content) as string;
  const cleanHtml = DOMPurify.sanitize(rawHtml);
  
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <div className="text-xs text-gray-500 mb-1">
          {model} • Typing...
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-800">
          <div 
            className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2 prose-invert"
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />
          <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span>
        </div>
      </div>
    </div>
  );
};

/**
 * Memoized message bubble component for better performance
 */
const MessageBubble = React.memo(({ 
  message, 
  onFollowUp 
}: { 
  message: Message; 
  onFollowUp?: (question: string) => void;
}) => {
  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setShowCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  // Parse markdown for assistant messages only
  const renderContent = () => {
    if (message.role === 'assistant') {
      // Configure marked for better rendering
      marked.setOptions({
        breaks: true, // Convert line breaks to <br>
        gfm: true, // GitHub Flavored Markdown
      });
      
      // Parse markdown and sanitize HTML to prevent XSS
      const rawHtml = marked.parse(message.content) as string;
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      
      return (
        <div 
          className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2 prose-invert"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      );
    }
    
    // User messages remain as plain text with pre-wrap
    return <div className="whitespace-pre-wrap">{message.content}</div>;
  };

  // Generate follow-up questions for assistant messages
  const followUpQuestions = message.role === 'assistant' ? [
    'Can you explain this further?',
    'Show me an example',
    'What are the alternatives?'
  ] : [];
  
  return (
    <div
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className="max-w-[80%]">
        <div className={`text-xs text-gray-500 mb-1 flex items-center gap-2 ${
          message.role === 'user' ? 'justify-end' : 'justify-start'
        }`}>
          <span>{message.role === 'user' ? 'You' : message.model} • {formatTimestamp(message.timestamp)}</span>
        </div>
        
        <div className="relative group">
          <div
            className={`rounded-lg px-4 py-3 ${
              message.role === 'user'
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-gray-200 text-gray-800'
            }`}
          >
            {renderContent()}
          </div>
          
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`absolute top-2 right-2 p-1.5 rounded transition-all ${
              message.role === 'user'
                ? 'bg-purple-700 hover:bg-purple-800 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            } opacity-0 group-hover:opacity-100`}
            title="Copy message"
          >
            {showCopied ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Follow-up Questions */}
        {message.role === 'assistant' && onFollowUp && followUpQuestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {followUpQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => onFollowUp(question)}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors border border-gray-300"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export const ChatPanel = () => {
  // Multi-chat session management
  const { 
    sessions, 
    activeSessionId, 
    loadSessions, 
    createNewSession, 
    loadSessionMessages, 
    saveCurrentSession, 
    deleteSession,
    setActiveSessionId,
    updateSessionTitle,
  } = useChatSessions();
  
  // Global app state
  const { messages, addMessage, selectedModel, isLoading, setIsLoading } = useAppState();
  const [input, setInput] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Lifecycle and coordination refs
  const isMountedRef = useRef(true);
  const initAbortController = useRef<AbortController | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  
  // Helper functions
  const saveSessionSafely = async (sessionId: string, title: string, messages: Message[]) => {
    // Queue saves to prevent concurrent writes
    saveQueueRef.current = saveQueueRef.current
      .then(() => saveCurrentSession(sessionId, title, messages))
      .catch(error => {
        console.error('Save failed:', error);
      });
    
    return saveQueueRef.current;
  };

  // Check if user is at bottom of scroll
  const isAtBottom = () => {
    if (!messagesContainerRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 50;
  };

  // When user manually scrolls during streaming, disable auto-scroll
  const handleScroll = () => {
    if (isLoading && streamingContent) {
      setShouldAutoScroll(false);
    }
  };

  // Initialize chat sessions on mount
  useEffect(() => {
    isMountedRef.current = true;
    const abortController = new AbortController();
    initAbortController.current = abortController;
    
    const initializeSessions = async () => {
      try {
        await loadSessions();
        
        if (!isMountedRef.current) return; // Guard #1
        
        // Try to restore last active session from localStorage
        const savedSessionId = localStorage.getItem('activeSessionId');
        
        if (savedSessionId) {
          try {
            // Validate session exists on backend before using
            const sessionMessages = await loadSessionMessages(savedSessionId);
            
            if (!isMountedRef.current) return; // Guard #2
            
            setActiveSessionId(savedSessionId);
            const clearMessages = useAppState.getState().clearMessages;
            clearMessages();
            sessionMessages.forEach(msg => addMessage(msg));
          } catch (error) {
            console.error('Saved session invalid, clearing:', error);
            localStorage.removeItem('activeSessionId');
            // Fall through to create new session logic below
          }
        }
        
        // Only proceed if no active session was restored
        if (!activeSessionId) {
          const currentSessions = useChatSessions.getState().sessions;
          
          if (currentSessions.length === 0) {
            if (!isMountedRef.current) return; // Guard #3
            const newSessionId = await createNewSession();
            setActiveSessionId(newSessionId);
            useAppState.getState().clearMessages();
          } else {
            const mostRecent = currentSessions[0];
            const sessionMessages = await loadSessionMessages(mostRecent.id);
            
            if (!isMountedRef.current) return; // Guard #4
            
            setActiveSessionId(mostRecent.id);
            const clearMessages = useAppState.getState().clearMessages;
            clearMessages();
            sessionMessages.forEach(msg => addMessage(msg));
          }
        }
        
        if (isMountedRef.current) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Session initialization failed:', error);
        if (isMountedRef.current) {
          setIsInitialized(true); // Show error state
        }
      }
    };
    
    initializeSessions();
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      initAbortController.current?.abort();
    };
  }, []); // Empty deps is correct - only run once on mount

  useEffect(() => {
    if (streamingContent) {
      // During streaming: only scroll if shouldAutoScroll is true
      if (shouldAutoScroll) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Not streaming: always scroll for new messages
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, shouldAutoScroll]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || !selectedModel || isLoading || !activeSessionId) return;

    const userInput = textToSend;
    const currentModel = selectedModel; // Capture model at send time
    const currentSession = sessions.find(s => s.id === activeSessionId);
    
    // Auto-title: Check BEFORE adding the new message
    const currentMessages = useAppState.getState().messages;
    const isFirstUserMessage = currentMessages.filter(m => m.role === 'user').length === 0;
    let sessionTitle = currentSession?.title || 'New Chat';
    
    // Create user message with model and timestamp
    const userMessage = { 
      id: `user-${Date.now()}-${Math.random()}`,
      role: 'user' as const, 
      content: userInput,
      model: 'user',
      timestamp: Date.now()
    };
    addMessage(userMessage);
    
    if (isFirstUserMessage && sessionTitle === 'New Chat') {
      // Extract first 6-8 words from user message
      const words = userInput.trim().split(/\s+/);
      const titleWords = words.slice(0, Math.min(8, words.length));
      sessionTitle = titleWords.join(' ') + (words.length > 8 ? '…' : '');
      
      // Update session title in store
      updateSessionTitle(activeSessionId, sessionTitle);
    }
    
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    // Capture whether user is at bottom BEFORE streaming starts
    setShouldAutoScroll(isAtBottom());

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Get all messages including the new user message for full context
    const allMessages = useAppState.getState().messages;
    
    // Stream the response
    let fullResponse = '';
    const assistantMessageId = `assistant-${Date.now()}-${Math.random()}`;
    
    await chatWithModelStreaming(
      currentModel,
      allMessages,
      // On each chunk
      (chunk: string) => {
        fullResponse += chunk;
        setStreamingContent(fullResponse);
      },
      // On complete
      async () => {
        setIsLoading(false);
        setStreamingContent('');
        abortControllerRef.current = null;  // Clear abort controller
        
        // Create final assistant message
        const assistantMessage = { 
          id: assistantMessageId,
          role: 'assistant' as const, 
          content: fullResponse,
          model: currentModel,
          timestamp: Date.now()
        };
        addMessage(assistantMessage);
        
        // Auto-save session after getting response
        const updatedMessages = useAppState.getState().messages;
        await saveSessionSafely(
          activeSessionId, 
          sessionTitle, 
          updatedMessages
        );
      },
      // On error
      async (error: string) => {
        setIsLoading(false);
        setStreamingContent('');
        abortControllerRef.current = null;  // Clear abort controller
        
        // Only add error message if it's not a user-initiated stop
        if (!error.includes('stopped by user')) {
          const errorMessage = {
            id: `error-${Date.now()}-${Math.random()}`,
            role: 'assistant' as const,
            content: `Error: ${error}`,
            model: currentModel,
            timestamp: Date.now()
          };
          addMessage(errorMessage);
        } else {
          // If user stopped, save the partial response
          if (fullResponse.trim()) {
            const assistantMessage = { 
              id: assistantMessageId,
              role: 'assistant' as const, 
              content: fullResponse + '\n\n_[Generation stopped]_',
              model: currentModel,
              timestamp: Date.now()
            };
            addMessage(assistantMessage);
          }
        }
        
        // Save even error messages or partial responses
        const updatedMessages = useAppState.getState().messages;
        await saveSessionSafely(
          activeSessionId, 
          sessionTitle, 
          updatedMessages
        );
      },
      abortController.signal  // Pass abort signal
    );
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleFollowUp = (question: string) => {
    setInput(question);
    // Auto-send the follow-up question
    setTimeout(() => handleSend(question), 100);
  };

  const handleNewChat = async () => {
    const newSessionId = await createNewSession();
    setActiveSessionId(newSessionId);
    useAppState.getState().clearMessages();
  };

  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    
    setActiveSessionId(sessionId);
    const sessionMessages = await loadSessionMessages(sessionId);
    
    // Clear current messages and load session messages
    const clearMessages = useAppState.getState().clearMessages;
    clearMessages();
    sessionMessages.forEach(msg => addMessage(msg));
  };

  const handleRenameChat = () => {
    if (!activeSessionId) return;
    setShowRenameModal(true);
  };

  const handleRenameConfirm = async (newTitle: string) => {
    if (!activeSessionId) return;
    
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (newTitle && newTitle !== currentSession?.title) {
      // Update in store
      updateSessionTitle(activeSessionId, newTitle);
      
      // Save to backend
      const currentMessages = useAppState.getState().messages;
      await saveCurrentSession(activeSessionId, newTitle, currentMessages);
      toast.success('Chat renamed successfully');
    }
  };

  const handleDeleteChat = () => {
    if (!activeSessionId) return;
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activeSessionId) return;
    
    try {
      // Delete from backend
      await deleteSession(activeSessionId);
      
      // Get remaining sessions
      const remainingSessions = sessions.filter(s => s.id !== activeSessionId);
      
      if (remainingSessions.length === 0) {
        // No sessions left, create a new one
        const newSessionId = await createNewSession();
        setActiveSessionId(newSessionId);
        useAppState.getState().clearMessages();
      } else {
        // Load the most recent remaining session
        const mostRecent = remainingSessions[0];
        setActiveSessionId(mostRecent.id);
        const sessionMessages = await loadSessionMessages(mostRecent.id);
        
        const clearMessages = useAppState.getState().clearMessages;
        clearMessages();
        sessionMessages.forEach(msg => addMessage(msg));
      }
      
      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex flex-col h-full bg-gray-50 items-center justify-center">
        <div className="text-gray-500">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Session Selector */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <select
          value={activeSessionId || ''}
          onChange={(e) => handleSwitchSession(e.target.value)}
          className="flex-1 text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.title}
            </option>
          ))}
        </select>
        
        {/* Rename and Delete buttons */}
        <button
          onClick={handleRenameChat}
          disabled={!activeSessionId}
          className="p-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Rename chat"
        >
          ✎
        </button>
        <button
          onClick={handleDeleteChat}
          disabled={!activeSessionId}
          className="p-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete chat"
        >
          🗑
        </button>
        
        <button
          onClick={handleNewChat}
          className="px-4 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors whitespace-nowrap"
        >
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <div className="text-xl font-semibold">Start a conversation</div>
              <div className="text-sm mt-2">Ask anything to your local AI model</div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              onFollowUp={handleFollowUp}
            />
          ))
        )}
        {isLoading && streamingContent && (
          <StreamingMessage content={streamingContent} model={selectedModel || 'AI'} />
        )}
        {isLoading && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-pulse">●</div>
                <div>Thinking...</div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
            disabled={isLoading || !selectedModel}
          />
          {isLoading ? (
            // Stop button when loading
            <button
              onClick={handleStop}
              className="px-6 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
              title="Stop generating"
            >
              <svg 
                className="w-5 h-5" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            // Send button when not loading
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || !selectedModel}
              className="px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          )}
        </div>
        {!selectedModel && (
          <div className="text-sm text-red-500 mt-2">
            Please select a model from the sidebar
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This action cannot be undone."
      />
      
      <InputModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        onConfirm={handleRenameConfirm}
        title="Rename Chat"
        label="Chat Title"
        defaultValue={sessions.find(s => s.id === activeSessionId)?.title || 'New Chat'}
        placeholder="Enter chat title"
      />
    </div>
  );
};


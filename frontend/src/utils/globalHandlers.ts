/**
 * Global Handler Registry
 * 
 * Centralized management for cross-component communication
 * without polluting the global window object
 */

type HandlerType = 'codeAIPanel' | 'documentSidebar';

const handlers: Map<HandlerType, () => void> = new Map();

export const registerGlobalHandler = (type: HandlerType, handler: () => void) => {
  handlers.set(type, handler);
};

export const callGlobalHandler = (type: HandlerType) => {
  const handler = handlers.get(type);
  if (handler) handler();
};

export const unregisterGlobalHandler = (type: HandlerType) => {
  handlers.delete(type);
};


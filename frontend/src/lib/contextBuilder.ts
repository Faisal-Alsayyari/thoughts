import type { Message, ChatNodeData } from '../types/node';

export function buildChildContext(parentData: ChatNodeData): Message[] {
  // If parent hasn't generated a response, should we allow adding a child? 
  // Probably, but maybe just use prompt. For safety, include only what's there.
  const newContext = [...parentData.context];
  
  if (parentData.prompt.trim()) {
    newContext.push({ role: 'user', content: parentData.prompt });
  }
  
  if (parentData.response.trim()) {
    newContext.push({ role: 'assistant', content: parentData.response });
  }
  
  return newContext;
}

export function buildRootContext(): Message[] {
  return []; // Empty context for root
}

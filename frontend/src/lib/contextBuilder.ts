import type { Message, ChatNodeData } from '../types/node';

export function buildChildContext(parentData: ChatNodeData): Message[] {
  return [...parentData.context, ...parentData.messages];
}

export function buildRootContext(): Message[] {
  return []; // Empty context for root
}

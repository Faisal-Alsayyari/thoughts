import type { Node } from '@xyflow/react';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatNodeData = {
  // The accumulated history from ancestors (fixed at creation)
  context: Message[];
  
  // The current interaction
  prompt: string;
  response: string;
  status: 'idle' | 'loading' | 'streaming';

  // Actions
  onChange?: (id: string, field: 'prompt' | 'response' | 'status', value: string) => void;
  onGenerate?: (id: string) => void;
  onAddChild?: (id: string) => void;
};

export type ChatNode = Node<ChatNodeData>;

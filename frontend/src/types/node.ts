import type { Node, Edge } from '@xyflow/react';

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

// Serializable version of ChatNodeData (no callbacks, status always idle)
export type SerializedChatNodeData = {
  context: Message[];
  prompt: string;
  response: string;
};

export type SerializedChatNode = Node<SerializedChatNodeData>;

export type Conversation = {
  id: string;
  title: string;
  pinned?: boolean;
  nodes: SerializedChatNode[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
};

import type { Node, Edge } from '@xyflow/react';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatNodeData = {
  // The accumulated history from ancestors (fixed at creation)
  context: Message[];

  // The conversation within this node (multi-turn)
  messages: Message[];

  // AI-generated summary for multi-turn thumbnail display
  summary?: string;
  // Number of messages when summary was last generated (for staleness check)
  summaryMessageCount?: number;

  // Transient streaming state
  status: 'idle' | 'loading' | 'streaming';

  // Actions
  onSendMessage?: (id: string, content: string) => void;
  onAddChild?: (id: string) => void;
  onExpand?: (id: string) => void;
  onUpdateSummary?: (id: string, summary: string) => void;
};

export type ChatNode = Node<ChatNodeData>;

// Serializable version of ChatNodeData (no callbacks, no status)
export type SerializedChatNodeData = {
  context: Message[];
  messages: Message[];
  summary?: string;
  summaryMessageCount?: number;
  // Legacy fields for migration
  prompt?: string;
  response?: string;
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

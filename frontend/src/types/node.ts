import type { Node, Edge } from '@xyflow/react';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatNodeData = {
  kind: 'chat';

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
  onAddChild?: (id: string, kind?: 'chat' | 'email') => void;
  onExpand?: (id: string) => void;
  onUpdateSummary?: (id: string, summary: string) => void;
};

export type EmailNodeData = {
  kind: 'email';

  to: string;
  subject: string;
  body: string;
  replyTo: string;

  // Transient send state (not persisted except sentAt/messageId)
  status: 'idle' | 'sending' | 'sent' | 'failed';
  sentAt?: number;
  messageId?: string;
  lastError?: string;

  // Actions
  onAddChild?: (id: string, kind?: 'chat' | 'email') => void;
  onExpand?: (id: string) => void;
  onUpdateEmail?: (id: string, patch: Partial<Pick<EmailNodeData, 'to' | 'subject' | 'body' | 'replyTo'>>) => void;
  onSendEmail?: (id: string, data: { to: string; subject: string; body: string; replyTo: string }) => void;
};

export type ThoughtsNodeData = ChatNodeData | EmailNodeData;

export type ChatNode = Node<ChatNodeData>;
export type EmailNode = Node<EmailNodeData>;
export type ThoughtsNode = Node<ThoughtsNodeData>;

// Serializable versions (no callbacks, no transient status)
export type SerializedChatNodeData = {
  kind?: 'chat'; // optional for backwards-compat with legacy nodes that have no kind
  context: Message[];
  messages: Message[];
  summary?: string;
  summaryMessageCount?: number;
  // Legacy fields for migration
  prompt?: string;
  response?: string;
};

export type SerializedEmailNodeData = {
  kind: 'email';
  to: string;
  subject: string;
  body: string;
  replyTo: string;
  sentAt?: number;
  messageId?: string;
};

export type SerializedNodeData = SerializedChatNodeData | SerializedEmailNodeData;

export type SerializedChatNode = Node<SerializedChatNodeData>;
export type SerializedNode = Node<SerializedNodeData>;

export type Conversation = {
  id: string;
  title: string;
  pinned?: boolean;
  nodes: SerializedNode[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
};

import type { ChatNode, ChatNodeData, SerializedChatNode } from '../types/node';

type Callbacks = {
  onChange: ChatNodeData['onChange'];
  onAddChild: ChatNodeData['onAddChild'];
};

export function serializeNodes(nodes: ChatNode[]): SerializedChatNode[] {
  return nodes.map((n) => ({
    ...n,
    data: {
      context: n.data.context,
      prompt: n.data.prompt,
      response: n.data.response,
    },
  }));
}

export function deserializeNodes(nodes: SerializedChatNode[], callbacks: Callbacks): ChatNode[] {
  return nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      status: 'idle' as const,
      onChange: callbacks.onChange,
      onAddChild: callbacks.onAddChild,
    },
  }));
}

import type { ChatNode, ChatNodeData, SerializedChatNode } from '../types/node';

type Callbacks = {
  onSendMessage: ChatNodeData['onSendMessage'];
  onAddChild: ChatNodeData['onAddChild'];
  onExpand: ChatNodeData['onExpand'];
  onUpdateSummary: ChatNodeData['onUpdateSummary'];
};

export function serializeNodes(nodes: ChatNode[]): SerializedChatNode[] {
  return nodes.map((n) => ({
    ...n,
    data: {
      context: n.data.context,
      messages: n.data.messages,
      summary: n.data.summary,
      summaryMessageCount: n.data.summaryMessageCount,
    },
  }));
}

export function deserializeNodes(nodes: SerializedChatNode[], callbacks: Callbacks): ChatNode[] {
  return nodes.map((n) => {
    // Migrate legacy prompt/response format to messages[]
    let messages = n.data.messages;
    if (!messages || !Array.isArray(messages)) {
      messages = [];
      const legacy = n.data as Record<string, unknown>;
      if (legacy.prompt && typeof legacy.prompt === 'string' && (legacy.prompt as string).trim()) {
        messages.push({ role: 'user', content: legacy.prompt as string });
      }
      if (legacy.response && typeof legacy.response === 'string' && (legacy.response as string).trim()) {
        messages.push({ role: 'assistant', content: legacy.response as string });
      }
    }

    return {
      ...n,
      data: {
        context: n.data.context,
        messages,
        summary: n.data.summary,
        summaryMessageCount: n.data.summaryMessageCount,
        status: 'idle' as const,
        onSendMessage: callbacks.onSendMessage,
        onAddChild: callbacks.onAddChild,
        onExpand: callbacks.onExpand,
        onUpdateSummary: callbacks.onUpdateSummary,
      },
    };
  });
}

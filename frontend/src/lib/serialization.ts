import type {
  ChatNode,
  EmailNode,
  ThoughtsNode,
  ChatNodeData,
  EmailNodeData,
  SerializedNode,
  SerializedChatNodeData,
  SerializedEmailNodeData,
} from '../types/node';

type Callbacks = {
  onSendMessage: ChatNodeData['onSendMessage'];
  onAddChild: ChatNodeData['onAddChild'];
  onExpand: ChatNodeData['onExpand'];
  onUpdateSummary: ChatNodeData['onUpdateSummary'];
  onUpdateEmail: EmailNodeData['onUpdateEmail'];
  onSendEmail: EmailNodeData['onSendEmail'];
};

export function serializeNodes(nodes: ThoughtsNode[]): SerializedNode[] {
  return nodes.map((n) => {
    if (n.data.kind === 'email') {
      const d = n.data;
      return {
        ...n,
        data: {
          kind: 'email' as const,
          to: d.to,
          subject: d.subject,
          body: d.body,
          replyTo: d.replyTo,
          sentAt: d.sentAt,
          messageId: d.messageId,
        } as SerializedEmailNodeData,
      };
    }

    // chat (covers legacy nodes without kind)
    const d = n.data as ChatNodeData;
    return {
      ...n,
      data: {
        kind: 'chat' as const,
        context: d.context,
        messages: d.messages,
        summary: d.summary,
        summaryMessageCount: d.summaryMessageCount,
      } as SerializedChatNodeData,
    };
  });
}

export function deserializeNodes(nodes: SerializedNode[], callbacks: Callbacks): ThoughtsNode[] {
  return nodes.map((n) => {
    if ((n.data as { kind?: string }).kind === 'email') {
      const d = n.data as SerializedEmailNodeData;
      const emailNode: EmailNode = {
        ...n,
        type: 'emailNode',
        data: {
          kind: 'email',
          to: d.to ?? '',
          subject: d.subject ?? '',
          body: d.body ?? '',
          replyTo: d.replyTo ?? '',
          sentAt: d.sentAt,
          messageId: d.messageId,
          status: 'idle',
          onAddChild: callbacks.onAddChild,
          onExpand: callbacks.onExpand,
          onUpdateEmail: callbacks.onUpdateEmail,
          onSendEmail: callbacks.onSendEmail,
        },
      };
      return emailNode;
    }

    // chat or legacy (no kind field)
    const d = n.data as SerializedChatNodeData;
    let messages = d.messages;
    if (!messages || !Array.isArray(messages)) {
      messages = [];
      const legacy = d as Record<string, unknown>;
      if (legacy.prompt && typeof legacy.prompt === 'string' && (legacy.prompt as string).trim()) {
        messages.push({ role: 'user', content: legacy.prompt as string });
      }
      if (legacy.response && typeof legacy.response === 'string' && (legacy.response as string).trim()) {
        messages.push({ role: 'assistant', content: legacy.response as string });
      }
    }

    const chatNode: ChatNode = {
      ...n,
      type: 'chatNode',
      data: {
        kind: 'chat',
        context: d.context ?? [],
        messages,
        summary: d.summary,
        summaryMessageCount: d.summaryMessageCount,
        status: 'idle',
        onSendMessage: callbacks.onSendMessage,
        onAddChild: callbacks.onAddChild,
        onExpand: callbacks.onExpand,
        onUpdateSummary: callbacks.onUpdateSummary,
      },
    };
    return chatNode;
  });
}

import type { Message, ChatNodeData, EmailNodeData, ThoughtsNodeData } from '../types/node';

export function buildChildContext(parentData: ChatNodeData): Message[] {
  return [...parentData.context, ...parentData.messages];
}

export function buildRootContext(): Message[] {
  return [];
}

/**
 * Seeds subject and body from the last assistant message in a parent chat node.
 * First non-empty line → subject (markdown headings stripped, max 100 chars).
 * Remaining text → body.
 */
export function seedEmailFromChat(parentData: ChatNodeData): { subject: string; body: string } {
  const lastAssistant = [...parentData.messages].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) return { subject: '', body: '' };

  const text = lastAssistant.content.trim();
  const newlineIdx = text.indexOf('\n');
  if (newlineIdx === -1) {
    return { subject: text.replace(/^#+\s*/, '').slice(0, 100), body: '' };
  }
  const subject = text.slice(0, newlineIdx).trim().replace(/^#+\s*/, '').slice(0, 100);
  const body = text.slice(newlineIdx + 1).trim();
  return { subject, body };
}

/**
 * Builds context for a chat child of an email node.
 * Emits a brief system-style summary of the sent email so the child chat can reference it.
 */
export function buildEmailChildContext(parentData: EmailNodeData): Message[] {
  if (parentData.status !== 'sent') return [];
  return [
    {
      role: 'assistant',
      content: `[Email sent to ${parentData.to} — Subject: "${parentData.subject}"\n\n${parentData.body}]`,
    },
  ];
}

/**
 * Unified context builder: dispatches to the right builder based on parent kind.
 */
export function buildChildContextFromParent(parentData: ThoughtsNodeData): Message[] {
  if (parentData.kind === 'chat') return buildChildContext(parentData);
  return buildEmailChildContext(parentData);
}

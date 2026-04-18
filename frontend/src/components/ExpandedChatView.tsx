import { useState, useRef, useEffect } from 'react';
import type { Message } from '../types/node';

interface ExpandedChatViewProps {
  nodeId: string;
  messages: Message[];
  context: Message[];
  status: 'idle' | 'loading' | 'streaming';
  onSendMessage: (id: string, content: string) => void;
  onSendInNewNode: (parentId: string, content: string) => void;
  onClose: () => void;
}

export default function ExpandedChatView({ nodeId, messages, context, status, onSendMessage, onSendInNewNode, onClose }: ExpandedChatViewProps) {
  const [input, setInput] = useState('');
  const [visible, setVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = status === 'loading' || status === 'streaming';

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleAnimatedClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isDisabled) return;
    onSendMessage(nodeId, input.trim());
    setInput('');
  };

  const handleSendNewNode = () => {
    if (!input.trim() || isDisabled) return;
    onSendInNewNode(nodeId, input.trim());
    setInput('');
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      background: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.97)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <button
          onClick={handleAnimatedClose}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ← Back to canvas
        </button>
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>
          {messages.length} message{messages.length !== 1 ? 's' : ''} · {context.length} context message{context.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages area */}
      <div className="custom-scrollbar" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Render ancestor context messages, dimmed */}
        {context.length > 0 && (
          <>
            <div style={{
              textAlign: 'center',
              fontSize: '12px',
              color: '#9ca3af',
              padding: '4px 8px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Parent context
            </div>
            {context.map((msg, i) => (
              <div key={`ctx-${i}`} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                opacity: 0.45,
              }}>
                <div style={{
                  maxWidth: '680px',
                  width: msg.role === 'assistant' ? '100%' : undefined,
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#390c6c' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#374151',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  border: msg.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div style={{
              borderBottom: '1px dashed #d1d5db',
              margin: '4px 0 8px',
            }} />
          </>
        )}

        {messages.length === 0 && context.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '15px',
          }}>
            Start a conversation...
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '680px',
              width: msg.role === 'assistant' ? '100%' : undefined,
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#390c6c' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#374151',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              border: msg.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {status === 'loading' && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '16px 16px 16px 4px',
              background: '#fff',
              border: '1px solid #e5e7eb',
              color: '#9ca3af',
              fontSize: '14px',
              fontStyle: 'italic',
            }}>
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #e5e7eb',
        background: '#fff',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isDisabled}
            placeholder="Type a message..."
            rows={1}
            className="custom-scrollbar"
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '14px',
              lineHeight: '1.5',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              background: isDisabled ? '#f9fafb' : '#fff',
              color: '#111827',
              boxSizing: 'border-box',
              maxHeight: '150px',
              overflowY: 'auto',
            }}
          />
          <button
            onClick={handleSend}
            disabled={isDisabled || !input.trim()}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              backgroundColor: isDisabled || !input.trim() ? '#9ca3af' : '#390c6c',
              border: 'none',
              borderRadius: '12px',
              cursor: isDisabled || !input.trim() ? 'default' : 'pointer',
              transition: 'background-color 0.2s',
              flexShrink: 0,
            }}
          >
            Send
          </button>
          <button
            onClick={handleSendNewNode}
            disabled={isDisabled || !input.trim() || messages.length === 0}
            title="Send this message as a new branched node"
            style={{
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: isDisabled || !input.trim() || messages.length === 0 ? '#9ca3af' : '#390c6c',
              backgroundColor: 'transparent',
              border: `1px solid ${isDisabled || !input.trim() || messages.length === 0 ? '#d1d5db' : '#390c6c'}`,
              borderRadius: '12px',
              cursor: isDisabled || !input.trim() || messages.length === 0 ? 'default' : 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            ↗ New node
          </button>
        </div>
      </div>
    </div>
  );
}

import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ChatNodeData } from '../types/node';
 
export default function ChatNode({ id, data, isConnectable }: NodeProps<Node<ChatNodeData>>) {
  const messages = data.messages || [];
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const hasResponse = assistantMessages.length > 0;
  const isMultiTurn = messages.length > 2;
  const isStreaming = data.status === 'loading' || data.status === 'streaming';

  const firstPrompt = userMessages[0]?.content || '';
  const firstResponse = assistantMessages[0]?.content || '';

  return (
    <div 
      className="react-flow__node-default" 
      onClick={(e) => {
        // Don't expand when clicking the Add button
        if ((e.target as HTMLElement).closest('[data-action="add-child"]')) return;
        data.onExpand?.(id);
      }}
      style={{ 
        padding: '15px', 
        borderRadius: '12px', 
        border: '1px solid #e5e7eb', 
        background: '#ffffff', 
        width: '350px',
        textAlign: 'left',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        fontFamily: 'Inter, system-ui, sans-serif',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      }}
    >
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />

      {/* Empty node — prompt to click */}
      {messages.length === 0 && !isStreaming && (
        <div style={{
          fontSize: '14px',
          color: '#9ca3af',
          fontStyle: 'italic',
          padding: '8px 0',
          textAlign: 'center',
        }}>
          Click to start chatting...
        </div>
      )}

      {/* Single-turn display: show prompt and response inline */}
      {messages.length > 0 && !isMultiTurn && (
        <>
          {/* Prompt section */}
          <div style={{ marginBottom: hasResponse || isStreaming ? '12px' : '0' }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
              marginBottom: '6px',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Input</span>
              <span>Context: {data.context.length}</span>
            </div>
            <div style={{
              fontSize: '14px',
              color: '#374151',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '10px',
            }}>
              {firstPrompt}
            </div>
          </div>

          {/* Response section */}
          {(firstResponse || isStreaming) && (
            <div style={{ 
              paddingTop: '12px',
              borderTop: '1px solid #f3f4f6'
            }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#9ca3af',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600
              }}>
                AI Response
              </div>
              <div className="nodrag custom-scrollbar"
                onWheelCapture={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ 
                  fontSize: '14px',
                  whiteSpace: 'pre-wrap',
                  color: '#374151',
                  lineHeight: '1.6',
                  maxHeight: '300px',
                  overflowY: 'auto', 
                  paddingRight: '8px',
                  userSelect: 'text',
                  cursor: 'text'
              }}>
                {firstResponse || (
                  <span style={{color:'#9ca3af', fontStyle: 'italic'}}>Thinking...</span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Multi-turn display: show summary or message count */}
      {isMultiTurn && (
        <div>
          <div style={{
            fontSize: '11px',
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 600,
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>{messages.length} messages</span>
            <span>Context: {data.context.length}</span>
          </div>
          
          {(() => {
            const lastMsg = messages[messages.length - 1];
            const preview = lastMsg?.content?.slice(0, 120) || '';
            const isUser = lastMsg?.role === 'user';
            return (
              <div style={{
                fontSize: '14px',
                color: isUser ? '#374151' : '#374151',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                background: isUser ? '#f9fafb' : '#faf5ff',
                borderRadius: '8px',
                padding: '10px',
                border: isUser ? 'none' : '1px solid #ede9fe',
              }}>
                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>
                  {isUser ? 'You' : 'AI'}:
                </span>{' '}
                {preview}{lastMsg?.content?.length > 120 ? '...' : ''}
              </div>
            );
          })()}

          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '8px',
            textAlign: 'center',
          }}>
            Click to expand conversation
          </div>
        </div>
      )}

      {/* Streaming indicator on canvas */}
      {isStreaming && messages.length === 0 && (
        <div style={{
          fontSize: '14px',
          color: '#9ca3af',
          fontStyle: 'italic',
          padding: '8px 0',
          textAlign: 'center',
        }}>
          Thinking...
        </div>
      )}

      {/* Action Bar */}
      {hasResponse && !isStreaming && (
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            data-action="add-child"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddChild?.(id);
            }}
            className="nodrag"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#fff',
              backgroundColor: '#390c6c',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#270949'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#390c6c'}
          >
            + Add
          </button>
        </div>
      )}
 
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}

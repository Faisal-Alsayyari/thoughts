import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCompletion } from '@ai-sdk/react';
import { useState, useEffect, useRef } from 'react';
import type { ChatNodeData } from '../types/node';
 
export default function ChatNode({ id, data, isConnectable }: NodeProps<Node<ChatNodeData>>) {
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [response, setResponse] = useState(data.response || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
 
  const {
    completion,
    complete,
    isLoading,
  } = useCompletion({
    api: '/api/chat',
    streamProtocol: 'text',
    initialCompletion: data.response,
    onFinish: (_prompt, completion) => {
      console.log('Stream finished. Full completion:', completion);
      data.onChange?.(id, 'response', completion);
      data.onChange?.(id, 'status', 'idle');
    },
    onError: (err) => {
      console.error('Stream error callback:', err);
      data.onChange?.(id, 'status', 'idle');
    }
  });

  // Sync completion to local state and global for visuals
  useEffect(() => {
    // Log updates during streaming to verify data is arriving
    if (isLoading && completion) {
       console.log('Streaming update chunk:', completion);
       setResponse(completion);
    }
  }, [completion, isLoading]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    console.log('[ChatNode] Generating response for prompt:', prompt);
    data.onChange?.(id, 'prompt', prompt);
    data.onChange?.(id, 'status', 'loading');
    
    await complete(prompt, { 
      body: { 
        context: data.context 
      } 
    });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt]);

  const isLocked = isLoading || !!response || !!data.response;
 
  return (
    <div className="react-flow__node-default" style={{ 
      padding: '15px', 
      borderRadius: '12px', 
      border: '1px solid #e5e7eb', 
      background: '#ffffff', 
      width: '350px',
      textAlign: 'left',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '8px', 
          fontSize: '11px', 
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600
        }}>
           <span>Input</span>
           <span>Context: {data.context.length}</span>
        </div>
        
        <div style={{
          position: 'relative',
          background: isLocked ? '#f9fafb' : '#fff',
          borderRadius: '8px',
          border: isLocked ? '1px solid transparent' : '1px solid #e5e7eb',
          transition: 'all 0.2s ease',
          boxShadow: isLocked ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <textarea
            ref={textareaRef}
            className="nodrag"
            value={prompt}
            disabled={isLocked}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            onBlur={() => data.onChange?.(id, 'prompt', prompt)}
            placeholder={isLocked ? "" : "Type a prompt..."}
            style={{ 
              width: '100%', 
              minHeight: '40px', 
              padding: '10px', 
              resize: 'none', 
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '14px',
              lineHeight: '1.5',
              color: isLocked ? '#374151' : '#111827',
              borderRadius: '8px',
              overflow: 'hidden',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
          {!isLocked && prompt.trim().length > 0 && (
            <button 
              onClick={handleGenerate}
              className="nodrag"
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                fontSize: '12px',
                color: '#4b5563',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '6px',
                transition: 'all 0.2s',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#1f2937';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.color = '#4b5563';
              }}
              title="Send message"
            >
              Send ↵
            </button>
          )}
        </div>
      </div>
      
      {/* Response Area */}
      {(response || data.response || isLoading) && (
        <div style={{ 
          marginTop: '12px',
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
             // onMouseDown stops the click from dragging the node, allowing text selection
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
            {response || data.response || (
              <span style={{color:'#9ca3af', fontStyle: 'italic'}}>Thinking...</span>
            )}
          </div>
        </div>
      )}

      {/* Action Bar */}
      {(response || data.response) && !isLoading && (
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => data.onAddChild?.(id)}
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

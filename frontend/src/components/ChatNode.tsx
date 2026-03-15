import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCompletion } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import type { ChatNodeData } from '../types/node';
 
export default function ChatNode({ id, data, isConnectable }: NodeProps<Node<ChatNodeData>>) {
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [response, setResponse] = useState(data.response || '');
 
  const {
    completion,
    complete,
    isLoading,
  } = useCompletion({
    api: '/api/chat',
    initialCompletion: data.response,
    onFinish: (_prompt, completion) => { // prefixed with _ to avoid unused var
      data.onChange?.(id, 'response', completion);
      data.onChange?.(id, 'status', 'idle');
    },
    onError: (err) => {
      console.error(err);
      data.onChange?.(id, 'status', 'idle');
    }
  });

  // Sync completion to local state and global for visuals
  useEffect(() => {
    if (isLoading && completion) {
       setResponse(completion);
    }
  }, [completion, isLoading]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    data.onChange?.(id, 'prompt', prompt);
    data.onChange?.(id, 'status', 'loading');
    
    await complete(prompt, { 
      body: { 
        context: data.context 
      } 
    });
  };
 
  return (
    <div className="react-flow__node-default" style={{ 
      padding: '10px', 
      borderRadius: '5px', 
      border: '1px solid #777', 
      background: '#fff', 
      width: '300px',
      textAlign: 'left'
    }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '12px', color: '#555' }}>
           Context: {data.context.length} msgs
        </div>
        <textarea
          className="nodrag"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt..."
          style={{ width: '100%', minHeight: '60px', padding: '5px', resize: 'vertical' }}
          onBlur={() => data.onChange?.(id, 'prompt', prompt)}
        />
      </div>
      
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <button 
          onClick={handleGenerate} 
          disabled={isLoading || !prompt.trim()}
          style={{ cursor: isLoading ? 'wait' : 'pointer' }}
        >
          {isLoading ? 'Generating...' : 'Generate'}
        </button>
        
        <button 
          onClick={() => data.onAddChild?.(id)}
          disabled={isLoading || (!response && !data.response)} 
        >
          Add Child
        </button>
      </div>
 
      <div style={{ 
        minHeight: '40px', 
        padding: '5px', 
        background: '#f4f4f4', 
        borderRadius: '3px',
        fontSize: '14px',
        whiteSpace: 'pre-wrap'
      }}>
        {response || data.response || <span style={{color:'#aaa'}}>AI response will appear here...</span>}
      </div>
 
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}

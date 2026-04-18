import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import { useChatTree } from '../hooks/useChatTree';
import ChatNode from './ChatNode';

export default function Canvas({ conversationId }: { conversationId: string }) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, loaded } = useChatTree(conversationId);
  
  const nodeTypes = useMemo(() => ({ chatNode: ChatNode }), []);

  if (!loaded) return null;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

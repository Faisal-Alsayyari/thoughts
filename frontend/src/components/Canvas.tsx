import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import { useChatTree } from '../hooks/useChatTree';
import ChatNode from './ChatNode';
import ExpandedChatView from './ExpandedChatView';

export default function Canvas({ conversationId }: { conversationId: string }) {
  const { 
    nodes, edges, onNodesChange, onEdgesChange, onConnect, loaded,
    expandedNodeId, handleCloseExpand, handleSendMessage, handleUpdateSummary,
    handleSendInNewNode,
  } = useChatTree(conversationId);
  
  const nodeTypes = useMemo(() => ({ chatNode: ChatNode }), []);

  const expandedNode = expandedNodeId ? nodes.find(n => n.id === expandedNodeId) : null;

  // Generate summary on close if multi-turn and stale
  const handleClose = async () => {
    if (expandedNode && expandedNode.data.messages.length > 2) {
      const needsSummary = !expandedNode.data.summary || 
        expandedNode.data.summaryMessageCount !== expandedNode.data.messages.length;
      
      if (needsSummary) {
        // Fire and forget — don't block close
        fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: expandedNode.data.messages }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.summary) {
              handleUpdateSummary(expandedNode.id, data.summary);
            }
          })
          .catch(console.error);
      }
    }
    handleCloseExpand();
  };

  if (!loaded) return null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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

      {expandedNode && (
        <ExpandedChatView
          nodeId={expandedNode.id}
          messages={expandedNode.data.messages}
          context={expandedNode.data.context}
          status={expandedNode.data.status}
          onSendMessage={handleSendMessage}
          onSendInNewNode={handleSendInNewNode}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

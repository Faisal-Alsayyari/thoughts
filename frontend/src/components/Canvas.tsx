import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo, useEffect } from 'react';
import { useChatTree } from '../hooks/useChatTree';
import ChatNode from './ChatNode';
import ExpandedChatView from './ExpandedChatView';

interface CanvasProps {
  conversationId: string;
  onTitleSetterReady?: (setter: (title: string) => void) => void;
  onResponse?: (response: Response) => void;
  onRateLimitExceeded?: (resetAt: number) => void;
  remaining: number | null;
  isLimited: boolean;
  resetAtLabel: string | null;
}

export default function Canvas({ conversationId, onTitleSetterReady, onResponse, onRateLimitExceeded, remaining, isLimited, resetAtLabel }: CanvasProps) {
  const { 
    nodes, edges, onNodesChange, onEdgesChange, onConnect, loaded,
    expandedNodeId, handleCloseExpand, handleSendMessage,
    handleSendInNewNode, streamingNodeId, streamingContent,
    setCustomTitle,
  } = useChatTree(conversationId, onResponse && onRateLimitExceeded ? { onResponse, onRateLimitExceeded } : undefined);

  useEffect(() => {
    onTitleSetterReady?.(setCustomTitle);
  }, [onTitleSetterReady, setCustomTitle]);
  
  const nodeTypes = useMemo(() => ({ chatNode: ChatNode }), []);

  const expandedNode = expandedNodeId ? nodes.find(n => n.id === expandedNodeId) : null;

  // Generate summary on close if multi-turn and stale
  // NOTE: Summarization disabled — thumbnails now show latest message instead
  // To re-enable, destructure handleUpdateSummary from useChatTree and uncomment below.
  const handleClose = async () => {
    // if (expandedNode && expandedNode.data.messages.length > 2) {
    //   const needsSummary = !expandedNode.data.summary || 
    //     expandedNode.data.summaryMessageCount !== expandedNode.data.messages.length;
    //   
    //   if (needsSummary) {
    //     fetch('/api/summarize', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ messages: expandedNode.data.messages }),
    //     })
    //       .then(res => res.json())
    //       .then(data => {
    //         if (data.summary) {
    //           handleUpdateSummary(expandedNode.id, data.summary);
    //         }
    //       })
    //       .catch(console.error);
    //   }
    // }
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
          streamingContent={streamingNodeId === expandedNode.id ? streamingContent : undefined}
          onSendMessage={handleSendMessage}
          onSendInNewNode={handleSendInNewNode}
          onClose={handleClose}
          remaining={remaining}
          isLimited={isLimited}
          resetAtLabel={resetAtLabel}
        />
      )}
    </div>
  );
}

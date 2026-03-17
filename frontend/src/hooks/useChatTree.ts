import { useState, useCallback, useEffect } from 'react';
import { 
  applyNodeChanges, applyEdgeChanges, addEdge, 
type Edge, 
  type OnNodesChange, type OnEdgesChange, type OnConnect 
} from '@xyflow/react';
import type { ChatNode } from '../types/node';
import { buildChildContext } from '../lib/contextBuilder';

export function useChatTree() {
  const [nodes, setNodes] = useState<ChatNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const handleOnChange = useCallback((id: string, field: 'prompt' | 'response' | 'status', value: string) => {
      setNodes((nds) => nds.map((n) => {
        if (n.id === id) {
             // Create a new data object reference !Important for ReactFlow
            return { ...n, data: { ...n.data, [field]: value } };
        }
        return n;
      }));
  }, []);

  const handleAddChild = useCallback((parentId: string) => {
    const newId = window.crypto.randomUUID();
    
    setNodes((currentNodes) => {
        const parent = currentNodes.find(n => n.id === parentId);
        if (!parent) return currentNodes;
        
        const newContext = buildChildContext(parent.data);
        
        const newNode: ChatNode = {
          id: newId,
          type: 'chatNode',
          // Offset x position based on total node count to prevent overlap
          position: { x: parent.position.x + 50 + (currentNodes.length * 20), y: parent.position.y + 450 },
          data: {
              context: newContext,
              prompt: '',
              response: '',
              status: 'idle',
              onChange: handleOnChange,
              onAddChild: handleAddChild
          }
        };
        return [...currentNodes, newNode];
    });
    
    setEdges((prevEdges) => [
        ...prevEdges,
        { id: `e${parentId}-${newId}`, source: parentId, target: newId }
    ]);
  }, [handleOnChange]);

  useEffect(() => {
    setNodes((nds) => {
      if (nds.length > 0) return nds;
      return [{
         id: 'root',
         type: 'chatNode',
         position: { x: 0, y: 0 },
         data: {
             context: [],
             prompt: '',
             response: '',
             status: 'idle',
             onChange: handleOnChange,
             onAddChild: handleAddChild
         }
      }];
    });
  }, [handleAddChild, handleOnChange]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds) as ChatNode[]),
    [],
  );
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
  };
}

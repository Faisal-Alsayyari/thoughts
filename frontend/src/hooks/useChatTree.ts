import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  applyNodeChanges, applyEdgeChanges, addEdge, 
type Edge, 
  type OnNodesChange, type OnEdgesChange, type OnConnect 
} from '@xyflow/react';
import type { ChatNode, Conversation } from '../types/node';
import { buildChildContext } from '../lib/contextBuilder';
import { saveConversation, loadConversation } from '../lib/db';
import { serializeNodes, deserializeNodes } from '../lib/serialization';

export function useChatTree(conversationId: string) {
  const [nodes, setNodes] = useState<ChatNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleSetRef = useRef(false);

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

  // Load from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    loadConversation(conversationId).then((conv) => {
      if (cancelled) return;
      if (conv) {
        const hydrated = deserializeNodes(conv.nodes, {
          onChange: handleOnChange,
          onAddChild: handleAddChild,
        });
        setNodes(hydrated);
        setEdges(conv.edges);
        titleSetRef.current = !!conv.title;
      } else {
        // New conversation — create root node
        setNodes([{
          id: 'root',
          type: 'chatNode',
          position: { x: 0, y: 0 },
          data: {
            context: [],
            prompt: '',
            response: '',
            status: 'idle',
            onChange: handleOnChange,
            onAddChild: handleAddChild,
          },
        }]);
        setEdges([]);
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [conversationId, handleOnChange, handleAddChild]);

  // Debounced auto-save to IndexedDB
  useEffect(() => {
    if (!loaded) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      // Derive title from first node's prompt
      const root = nodes.find((n) => n.id === 'root');
      const title = root?.data.prompt
        ? root.data.prompt.slice(0, 50) + (root.data.prompt.length > 50 ? '...' : '')
        : 'New conversation';

      const conv: Conversation = {
        id: conversationId,
        title,
        nodes: serializeNodes(nodes),
        edges,
        createdAt: Date.now(), // overwritten only on first save (put is upsert)
        updatedAt: Date.now(),
      };

      saveConversation(conv);
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges, loaded, conversationId]);

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
    loaded,
  };
}

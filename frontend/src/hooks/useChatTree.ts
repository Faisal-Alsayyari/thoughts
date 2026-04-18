import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  applyNodeChanges, applyEdgeChanges, addEdge, 
type Edge, 
  type OnNodesChange, type OnEdgesChange, type OnConnect 
} from '@xyflow/react';
import type { ChatNode, Conversation, Message } from '../types/node';
import { buildChildContext } from '../lib/contextBuilder';
import { saveConversation, loadConversation } from '../lib/db';
import { serializeNodes, deserializeNodes } from '../lib/serialization';

export function useChatTree(conversationId: string) {
  const [nodes, setNodes] = useState<ChatNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customTitleRef = useRef<string | null>(null);
  const lastContentHashRef = useRef<string>('');
  const lastUpdatedAtRef = useRef<number>(Date.now());
  const createdAtRef = useRef<number>(Date.now());

  // Streaming optimization: accumulate tokens in a ref, flush to state on interval
  const streamingContentRef = useRef('');
  const streamingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [streamingNodeId, setStreamingNodeId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');

  const startStreamingFlush = useCallback(() => {
    streamingIntervalRef.current = setInterval(() => {
      setStreamingContent(streamingContentRef.current);
    }, 50);
  }, []);

  const stopStreamingFlush = useCallback(() => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    setStreamingContent('');
    setStreamingNodeId(null);
  }, []);

  /*
  // Append a message to a node's messages array
  const updateNodeMessages = useCallback((id: string, messages: Message[]) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, messages } };
      }
      return n;
    }));
  }, []);

  const updateNodeStatus = useCallback((id: string, status: 'idle' | 'loading' | 'streaming') => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, status } };
      }
      return n;
    }));
  }, []); */

  const handleSendMessage = useCallback(async (id: string, content: string) => {
    // Get current node
    let currentMessages: Message[] = [];
    let currentContext: Message[] = [];

    setNodes((nds) => {
      const node = nds.find((n) => n.id === id);
      if (node) {
        currentMessages = [...node.data.messages];
        currentContext = node.data.context;
      }
      return nds;
    });

    const userMessage: Message = { role: 'user', content };
    const updatedMessages = [...currentMessages, userMessage];

    // Update messages with user message and set loading
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, messages: updatedMessages, status: 'loading' as const } };
      }
      return n;
    }));

    try {
      // Build the full context for the API call: ancestor context + prior messages in this node + new user message
      const apiContext = [...currentContext, ...currentMessages];
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content, context: apiContext }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Start streaming — update node status once, begin throttled content flush
      streamingContentRef.current = '';
      setStreamingNodeId(id);
      setNodes((nds) => nds.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, status: 'streaming' as const } };
        }
        return n;
      }));
      startStreamingFlush();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamingContentRef.current += decoder.decode(value, { stream: true });
      }

      // Finalize — write completed message + reset status in one setNodes call
      const assistantContent = streamingContentRef.current;
      stopStreamingFlush();
      streamingContentRef.current = '';

      setNodes((nds) => nds.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              messages: [...updatedMessages, { role: 'assistant' as const, content: assistantContent }],
              status: 'idle' as const,
            }
          };
        }
        return n;
      }));
    } catch (err) {
      console.error('Stream error:', err);
      stopStreamingFlush();
      streamingContentRef.current = '';
      setNodes((nds) => nds.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, status: 'idle' as const } };
        }
        return n;
      }));
    }
  }, [startStreamingFlush, stopStreamingFlush]);

  const handleUpdateSummary = useCallback((id: string, summary: string) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, summary, summaryMessageCount: n.data.messages.length } };
      }
      return n;
    }));
  }, []);

  const handleExpand = useCallback((id: string) => {
    setExpandedNodeId(id);
  }, []);

  const handleCloseExpand = useCallback(() => {
    setExpandedNodeId(null);
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
          position: { x: parent.position.x + 50 + (currentNodes.length * 20), y: parent.position.y + 450 },
          data: {
              context: newContext,
              messages: [],
              status: 'idle',
              onSendMessage: handleSendMessage,
              onAddChild: handleAddChild,
              onExpand: handleExpand,
              onUpdateSummary: handleUpdateSummary,
          }
        };
        return [...currentNodes, newNode];
    });
    
    setEdges((prevEdges) => [
        ...prevEdges,
        { id: `e${parentId}-${newId}`, source: parentId, target: newId }
    ]);
  }, [handleSendMessage, handleExpand, handleUpdateSummary]);

  const handleSendInNewNode = useCallback(async (parentId: string, content: string) => {
    const newId = window.crypto.randomUUID();

    setNodes((currentNodes) => {
      const parent = currentNodes.find(n => n.id === parentId);
      if (!parent) return currentNodes;

      const newContext = buildChildContext(parent.data);

      const newNode: ChatNode = {
        id: newId,
        type: 'chatNode',
        position: { x: parent.position.x + 50 + (currentNodes.length * 20), y: parent.position.y + 450 },
        data: {
          context: newContext,
          messages: [],
          status: 'idle',
          onSendMessage: handleSendMessage,
          onAddChild: handleAddChild,
          onExpand: handleExpand,
          onUpdateSummary: handleUpdateSummary,
        }
      };
      return [...currentNodes, newNode];
    });

    setEdges((prevEdges) => [
      ...prevEdges,
      { id: `e${parentId}-${newId}`, source: parentId, target: newId }
    ]);

    // Switch to the new node and send the message there
    setExpandedNodeId(newId);
    setTimeout(() => {
      handleSendMessage(newId, content);
    }, 50);
  }, [handleSendMessage, handleAddChild, handleExpand, handleUpdateSummary]);

  // Load from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    loadConversation(conversationId).then((conv) => {
      if (cancelled) return;
      if (conv) {
        customTitleRef.current = conv.title || null;
        createdAtRef.current = conv.createdAt || Date.now();
        lastUpdatedAtRef.current = conv.updatedAt || Date.now();
        const hydrated = deserializeNodes(conv.nodes, {
          onSendMessage: handleSendMessage,
          onAddChild: handleAddChild,
          onExpand: handleExpand,
          onUpdateSummary: handleUpdateSummary,
        });
        // Initialize content hash from loaded data so the auto-save effect
        // doesn't see a mismatch and incorrectly bump updatedAt.
        lastContentHashRef.current = JSON.stringify(
          hydrated.map(n => ({ id: n.id, messages: n.data.messages }))
        );
        setNodes(hydrated);
        setEdges(conv.edges);
      } else {
        // New conversation — create root node
        setNodes([{
          id: 'root',
          type: 'chatNode',
          position: { x: 0, y: 0 },
          data: {
            context: [],
            messages: [],
            status: 'idle',
            onSendMessage: handleSendMessage,
            onAddChild: handleAddChild,
            onExpand: handleExpand,
            onUpdateSummary: handleUpdateSummary,
          },
        }]);
        setEdges([]);
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [conversationId, handleSendMessage, handleAddChild, handleExpand, handleUpdateSummary]);

  // Debounced auto-save to IndexedDB
  useEffect(() => {
    if (!loaded) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      const root = nodes.find((n) => n.id === 'root');
      const firstUserMsg = root?.data.messages.find(m => m.role === 'user');
      const autoTitle = firstUserMsg
        ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
        : 'New conversation';

      // Use custom title if manually renamed, otherwise auto-generate.
      // Once auto-title is generated from the first message, persist it so
      // it doesn't revert to 'New conversation' on future saves.
      if (!customTitleRef.current && autoTitle !== 'New conversation') {
        customTitleRef.current = autoTitle;
      }
      const title = customTitleRef.current || autoTitle;

      // Only bump updatedAt when message content actually changes (not on
      // node drags / position changes), so the sidebar stays stable.
      const contentHash = JSON.stringify(
        nodes.map(n => ({ id: n.id, messages: n.data.messages }))
      );
      if (contentHash !== lastContentHashRef.current) {
        lastContentHashRef.current = contentHash;
        lastUpdatedAtRef.current = Date.now();
      }

      const conv: Conversation = {
        id: conversationId,
        title,
        nodes: serializeNodes(nodes),
        edges,
        createdAt: createdAtRef.current,
        updatedAt: lastUpdatedAtRef.current,
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

  const setCustomTitle = useCallback((title: string) => {
    customTitleRef.current = title;
    lastUpdatedAtRef.current = Date.now();
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    loaded,
    expandedNodeId,
    handleExpand,
    handleCloseExpand,
    handleSendMessage,
    handleUpdateSummary,
    handleSendInNewNode,
    streamingNodeId,
    streamingContent,
    setCustomTitle,
  };
}

/**
 * Workflow Editor Component
 * Visual workflow editor using React Flow
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles visual workflow editing
 * - Open/Closed: Easy to extend with new node types
 */

'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  NodeChange,
  EdgeChange,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { WorkflowDefinition, NodeType, NodeConfig } from '@workflow/shared-types';
import CustomNode from './custom-node';
import { useExecutionStore } from '@/stores/execution-store';

interface WorkflowEditorProps {
  definition: WorkflowDefinition;
  onDefinitionChange: (definition: WorkflowDefinition) => void;
  onNodeSelect?: (node: NodeConfig | null) => void;
}

// Custom node types for React Flow
const nodeTypes = {
  custom: CustomNode,
};

// Helper function to create default config for node type
function createDefaultNodeConfig(nodeType: NodeType, nodeId: string, label: string, position: { x: number; y: number }): NodeConfig {
  const baseConfig = {
    nodeId,
    type: nodeType,
    label,
    position,
  };

  switch (nodeType) {
    case 'trigger':
      return {
        ...baseConfig,
        type: 'trigger',
        config: { triggerType: 'manual' },
      } as NodeConfig;
    case 'http_request':
      return {
        ...baseConfig,
        type: 'http_request',
        config: { url: '', method: 'GET' as any },
      } as NodeConfig;
    case 'data_transform':
      return {
        ...baseConfig,
        type: 'data_transform',
        config: { transformScript: '' },
      } as NodeConfig;
    case 'conditional':
      return {
        ...baseConfig,
        type: 'conditional',
        config: { condition: '' },
      } as NodeConfig;
    case 'delay':
      return {
        ...baseConfig,
        type: 'delay',
        config: { delayMs: 1000 },
      } as NodeConfig;
    case 'webhook':
      return {
        ...baseConfig,
        type: 'webhook',
        config: { webhookId: '', method: 'POST' as any },
      } as NodeConfig;
    case 'email':
      return {
        ...baseConfig,
        type: 'email',
        config: {
          credentialId: '',
          to: '',
          subject: '',
          body: '',
        },
      } as NodeConfig;
    case 'google_calendar':
      return {
        ...baseConfig,
        type: 'google_calendar',
        config: {
          credentialId: '',
          summary: '',
          description: '',
          startTime: '',
          endTime: '',
          attendees: '',
          createMeet: false,
        },
      } as NodeConfig;
    case 'whatsapp':
      return {
        ...baseConfig,
        type: 'whatsapp',
        config: {
          credentialId: '',
          to: '',
          message: '',
          mediaUrl: '',
        },
      } as NodeConfig;
    case 'csv_upload':
      return {
        ...baseConfig,
        type: 'csv_upload',
        config: {
          fileId: '',
          anonymize: true,
        },
      } as NodeConfig;
    case 'ai_content_generator':
      return {
        ...baseConfig,
        type: 'ai_content_generator',
        config: {
          contentType: 'email',
          purpose: '',
          targetAudience: '',
          keyPoints: '',
          tone: 'professional',
        },
      } as NodeConfig;
    case 'compliance_checker':
      return {
        ...baseConfig,
        type: 'compliance_checker',
        config: {
          contentField: 'generatedContent',
          contentType: 'email',
          productCategory: 'general',
          minimumScore: 80,
        },
      } as NodeConfig;
    case 'compliance_report':
      return {
        ...baseConfig,
        type: 'compliance_report',
        config: {
          reportFormat: 'json',
          includeStatistics: true,
          includeViolations: true,
          groupBy: 'execution',
        },
      } as NodeConfig;
    default:
      return baseConfig as NodeConfig;
  }
}

function WorkflowEditorInner({ definition, onDefinitionChange, onNodeSelect }: WorkflowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();
  const [nodeIdCounter, setNodeIdCounter] = useState(1);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Get execution state for real-time updates
  const { nodeStatuses } = useExecutionStore();

  // Undo/Redo state
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);

  // Convert workflow definition to React Flow format with execution status
  const initialNodes: Node[] = useMemo(
    () =>
      definition.nodes.map((node) => {
        const status = nodeStatuses[node.nodeId];
        return {
          id: node.nodeId,
          type: 'custom',
          position: node.position,
          data: {
            label: node.label,
            type: node.type,
            status: status?.status,
            error: status?.error,
          },
        };
      }),
    [definition.nodes, nodeStatuses]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      definition.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })),
    [definition.edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update node data when execution status changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const status = nodeStatuses[node.id];
        return {
          ...node,
          data: {
            ...node.data,
            status: status?.status,
            error: status?.error,
          },
        };
      })
    );
  }, [nodeStatuses, setNodes]);

  // Mark as initialized after first render
  useEffect(() => {
    isInitialLoadRef.current = false;
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Save to history when nodes or edges change
  useEffect(() => {
    if (isInitialLoadRef.current || isUndoRedoRef.current) {
      return;
    }

    // Add current state to history
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: [...nodes], edges: [...edges] });

      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }

      return newHistory;
    });

    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [nodes, edges]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Undo: Ctrl+Z / Cmd+Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y
      if (
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') ||
        ((event.ctrlKey || event.metaKey) && event.key === 'y')
      ) {
        event.preventDefault();
        redo();
        return;
      }

      // Delete key - remove selected nodes/edges
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter((node) => node.selected);
        const selectedEdges = edges.filter((edge) => edge.selected);

        if (selectedNodes.length > 0) {
          event.preventDefault();
          const nodeIdsToDelete = new Set(selectedNodes.map((n) => n.id));

          // Remove selected nodes
          setNodes((nds) => nds.filter((node) => !node.selected));

          // Remove edges connected to deleted nodes
          setEdges((eds) =>
            eds.filter(
              (edge) => !nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)
            )
          );
        } else if (selectedEdges.length > 0) {
          event.preventDefault();
          // Remove selected edges
          setEdges((eds) => eds.filter((edge) => !edge.selected));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, setNodes, setEdges, undo, redo]);

  // Debounced sync function to avoid infinite loops
  const syncToDefinition = useCallback(() => {
    // Don't sync on initial load
    if (isInitialLoadRef.current) return;

    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Debounce sync to avoid rapid updates
    syncTimeoutRef.current = setTimeout(() => {
      const updatedNodes: NodeConfig[] = nodes.map((node) => {
        // Find existing node config or create new one
        const existingNode = definition.nodes.find((n) => n.nodeId === node.id);
        if (existingNode) {
          return {
            ...existingNode,
            position: node.position,
            label: node.data.label,
          };
        }
        // Create new node config for dropped nodes
        return createDefaultNodeConfig(
          node.data.type,
          node.id,
          node.data.label,
          node.position
        );
      });

      const updatedEdges = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      }));

      onDefinitionChange({
        nodes: updatedNodes,
        edges: updatedEdges,
      });
    }, 300); // 300ms debounce
  }, [nodes, edges, definition.nodes, onDefinitionChange]);

  // Sync when nodes or edges change
  useEffect(() => {
    syncToDefinition();
  }, [nodes, edges, syncToDefinition]);

  // Validate connection to prevent invalid edges
  const isValidConnection = useCallback(
    (connection: Connection) => {
      // Prevent self-connection
      if (connection.source === connection.target) {
        return false;
      }

      // Prevent duplicate connections
      const isDuplicate = edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          edge.sourceHandle === connection.sourceHandle &&
          edge.targetHandle === connection.targetHandle
      );

      if (isDuplicate) {
        return false;
      }

      // Check for cycles (simple BFS check)
      const adjacencyList = new Map<string, string[]>();

      // Build adjacency list from existing edges
      edges.forEach((edge) => {
        if (!adjacencyList.has(edge.source)) {
          adjacencyList.set(edge.source, []);
        }
        adjacencyList.get(edge.source)!.push(edge.target);
      });

      // Add the new connection
      if (!adjacencyList.has(connection.source!)) {
        adjacencyList.set(connection.source!, []);
      }
      adjacencyList.get(connection.source!)!.push(connection.target!);

      // BFS to detect cycle
      const hasCycle = (start: string): boolean => {
        const visited = new Set<string>();
        const queue: string[] = [start];

        while (queue.length > 0) {
          const current = queue.shift()!;

          if (current === start && visited.size > 0) {
            return true; // Cycle detected
          }

          if (visited.has(current)) {
            continue;
          }

          visited.add(current);
          const neighbors = adjacencyList.get(current) || [];
          queue.push(...neighbors);
        }

        return false;
      };

      if (hasCycle(connection.source!)) {
        alert('Cannot create this connection: it would create a cycle in the workflow.');
        return false;
      }

      return true;
    },
    [edges]
  );

  // Handle edge connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (isValidConnection(params)) {
        setEdges((eds) => addEdge(params, eds));
      }
    },
    [setEdges, isValidConnection]
  );

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow') as NodeType;

      if (!nodeType || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNodeId = `${nodeType}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: 'custom',
        position,
        data: {
          label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace('_', ' ')} ${nodeIdCounter}`,
          type: nodeType,
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setNodeIdCounter((count) => count + 1);
    },
    [project, nodeIdCounter, setNodes]
  );

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeSelect) {
        // Find the node in the current definition (which includes recently dropped nodes)
        const workflowNode = definition.nodes.find((n) => n.nodeId === node.id);
        if (workflowNode) {
          onNodeSelect(workflowNode);
        } else {
          // If not found, create a default config for new nodes
          const defaultNode = createDefaultNodeConfig(
            node.data.type,
            node.id,
            node.data.label,
            node.position
          );
          onNodeSelect(defaultNode);
        }
      }
    },
    [definition.nodes, onNodeSelect]
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        fitView
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  );
}

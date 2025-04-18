import { Edge, MarkerType } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import dagre from 'dagre';

import { PipecatNode } from '../store/workflow-store';

/**
 * Layout constants
 */
const NODE_WIDTH = 400;
const NODE_HEIGHT = 200;
const NODE_SPACING_H = 300;
const NODE_SPACING_V = 200;

/**
 * Creates a graph from a flow configuration
 * @param flowConfig - The flow configuration
 * @returns The created graph with nodes and edges
 */
export function createFlowFromConfig(flowConfig: any): { nodes: PipecatNode[], edges: Edge[] } {
  // Store for nodes and edges
  const nodes: PipecatNode[] = [];
  const edges: Edge[] = [];
  
  // Map for node IDs (label to ID mapping)
  const nodeIdMap: Record<string, string> = {};
  
  // Track function nodes for edge creation
  const functionNodes: Record<string, { 
    node: PipecatNode, 
    sourceId: string, 
    targetName?: string 
  }> = {};
  
  // Create dagre graph for layout
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR', // Left to right layout
    nodesep: NODE_SPACING_V,
    ranksep: NODE_SPACING_H,
    edgesep: 50,
    marginx: 100,
    marginy: 100,
  });
  g.setDefaultEdgeLabel(() => ({}));
  
  // First pass: Create all main nodes
  Object.entries(flowConfig.nodes).forEach(([nodeId, nodeConfig]: [string, any]) => {
    const newNodeId = uuidv4();
    nodeIdMap[nodeId] = newNodeId;
    
    let nodeType: string;
    if (nodeId === flowConfig.initial_node) {
      nodeType = 'startNode';
    } else if (nodeId === 'end') {
      nodeType = 'endNode';
    } else {
      nodeType = 'flowNode';
    }
    
    // Create the node
    const node: PipecatNode = {
      id: newNodeId,
      type: nodeType,
      position: { x: 0, y: 0 }, // Will be set by the layout algorithm
      data: {
        properties: {
          task_messages: nodeConfig.task_messages,
          pre_actions: nodeConfig.pre_actions || [],
          post_actions: nodeConfig.post_actions || [],
        },
        label: nodeId,
        nodeType,
      },
    };
    
    // Add role_messages if present (start node only)
    if (nodeConfig.role_messages) {
      node.data.properties.role_messages = nodeConfig.role_messages;
    }
    
    nodes.push(node);
    
    // Add to dagre graph for layout
    g.setNode(newNodeId, { 
      width: NODE_WIDTH, 
      height: NODE_HEIGHT,
      nodeId: newNodeId, 
    });
  });
  
  // Second pass: Create function nodes and merge nodes
  Object.entries(flowConfig.nodes).forEach(([nodeId, nodeConfig]: [string, any]) => {
    const sourceNodeId = nodeIdMap[nodeId];
    
    if (nodeConfig.functions && Array.isArray(nodeConfig.functions)) {
      // Group functions by target for potential merge nodes
      const targetGroups: Record<string, Array<any>> = {};
      
      nodeConfig.functions.forEach((funcConfig: any) => {
        const targetName = funcConfig.function.transition_to;
        
        if (targetName) {
          if (!targetGroups[targetName]) {
            targetGroups[targetName] = [];
          }
          targetGroups[targetName].push(funcConfig);
        }
      });
      
      // Create function nodes
      nodeConfig.functions.forEach((funcConfig: any) => {
        const functionId = uuidv4();
        const functionNode: PipecatNode = {
          id: functionId,
          type: 'functionNode',
          position: { x: 0, y: 0 }, // Will be set by the layout algorithm
          data: {
            properties: {
              task_messages: [],
              function: { ...funcConfig.function },
              isNodeFunction: false, // Will be updated when edges are created
            },
            label: funcConfig.function.name,
            nodeType: 'functionNode',
          },
        };
        
        nodes.push(functionNode);
        
        // Add to dagre graph
        g.setNode(functionId, { 
          width: NODE_WIDTH, 
          height: 150, // Function nodes are usually smaller
          nodeId: functionId, 
        });
        
        // Create edge from source to function
        const edgeId = uuidv4();
        edges.push({
          id: edgeId,
          source: sourceNodeId,
          target: functionId,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        });
        
        // Add edge to dagre
        g.setEdge(sourceNodeId, functionId);
        
        // Store function node for later edge creation
        functionNodes[functionId] = {
          node: functionNode,
          sourceId: sourceNodeId,
          targetName: funcConfig.function.transition_to,
        };
      });
      
      // Create merge nodes for targets with multiple functions
      Object.entries(targetGroups).forEach(([targetName, functions]) => {
        if (functions.length > 1 && nodeIdMap[targetName]) {
          const mergeId = uuidv4();
          const mergeNode: PipecatNode = {
            id: mergeId,
            type: 'mergeNode',
            position: { x: 0, y: 0 },
            data: {
              properties: {
                task_messages: [{ role: 'system', content: 'Merge node' }],
              },
              label: `Merge to ${targetName}`,
              nodeType: 'mergeNode',
             
            },
          };
          
          nodes.push(mergeNode);
          
          // Add to dagre
          g.setNode(mergeId, { 
            width: 140, 
            height: 60 + (functions.length * 20), // Adjust height based on input count
            nodeId: mergeId, 
          });
          
          // Create edge from merge to target
          const mergeToTargetEdgeId = uuidv4();
          edges.push({
            id: mergeToTargetEdgeId,
            source: mergeId,
            target: nodeIdMap[targetName],
            type: 'smoothstep',
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          });
          
          // Add edge to dagre
          g.setEdge(mergeId, nodeIdMap[targetName]);
          
          // Update function nodes to point to the merge node
          functions.forEach(func => {
            // Find the function node
            const funcNodeId = Object.keys(functionNodes).find(id => {
              const funcNode = functionNodes[id];

              return funcNode.sourceId === sourceNodeId && 
                    funcNode.node.data.properties.function.name === func.function.name;
            });
            
            if (funcNodeId) {
              // Create edge from function to merge
              const funcToMergeEdgeId = uuidv4();
              edges.push({
                id: funcToMergeEdgeId,
                source: funcNodeId,
                target: mergeId,
                type: 'smoothstep',
                animated: true,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                },
              });
              
              // Add edge to dagre
              g.setEdge(funcNodeId, mergeId);
              
              // Remove target from function node to avoid duplicate edges
              delete functionNodes[funcNodeId].targetName;
            }
          });
        }
      });
    }
  });
  
  // Third pass: Connect function nodes directly to their targets
  Object.entries(functionNodes).forEach(([functionId, funcData]) => {
    if (funcData.targetName && nodeIdMap[funcData.targetName]) {
      // Create direct edge from function to target
      const edgeId = uuidv4();
      edges.push({
        id: edgeId,
        source: functionId,
        target: nodeIdMap[funcData.targetName],
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      });
      
      // Add edge to dagre
      g.setEdge(functionId, nodeIdMap[funcData.targetName]);
    }
    
    // Update isNodeFunction property
    const outgoingEdges = edges.filter(edge => edge.source === functionId);
    funcData.node.data.properties.isNodeFunction = outgoingEdges.length === 0;
  });
  
  // Run the layout algorithm
  dagre.layout(g);
  
  // Apply positions from dagre
  g.nodes().forEach(nodeId => {
    const dagreNode = g.node(nodeId);
    if (dagreNode && dagreNode.nodeId) {
      const node = nodes.find(n => n.id === dagreNode.nodeId);
      if (node) {
        node.position = {
          x: dagreNode.x - dagreNode.width / 2,
          y: dagreNode.y - dagreNode.height / 2,
        };
      }
    }
  });
  
  return { nodes, edges };
}
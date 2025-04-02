import { Edge } from 'reactflow';
import { PipecatNode } from '../store/workflow-store';

/**
 * Generates a flow configuration from the graph
 * @param nodes - The nodes in the flow
 * @param edges - The edges in the flow
 * @returns The generated flow configuration
 * @throws {Error} If the graph is invalid
 */
export function generateFlowConfig(nodes: PipecatNode[], edges: Edge[]) {
  if (nodes.length === 0) {
    throw new Error("No nodes found in the graph");
  }

  // Find the start node
  const startNode = nodes.find((node) => node.type === 'startNode');
  if (!startNode) {
    throw new Error("No start node found in the flow");
  }

  /**
   * Finds all functions connected to a node
   * @param node - The node to find functions for
   * @returns Array of function configurations
   */
  function findConnectedFunctions(node: PipecatNode) {
    const functions = [];
    const nodeOutgoingEdges = edges.filter(edge => edge.source === node.id);

    for (const edge of nodeOutgoingEdges) {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (!targetNode) continue;

      if (targetNode.type === 'functionNode') {
        // Create base function configuration
        const functionData = targetNode.data.properties.function;
        const funcConfig = {
          type: "function",
          function: { ...functionData }
        };

        // Find where this function connects to (if anywhere)
        const functionTargetEdges = edges.filter(e => e.source === targetNode.id);
        if (functionTargetEdges.length > 0) {
          for (const targetEdge of functionTargetEdges) {
            const nextNode = nodes.find(n => n.id === targetEdge.target);
            if (!nextNode) continue;

            // If it connects to a merge node, follow through to final target
            if (nextNode.type === 'mergeNode') {
              const mergeOutEdge = edges.find(e => e.source === nextNode.id);
              if (!mergeOutEdge) continue;

              const finalNode = nodes.find(n => n.id === mergeOutEdge.target);
              if (finalNode) {
                funcConfig.function.transition_to = finalNode.data.label;
                break; // Use first valid target found
              }
            } else {
              // Direct connection to target node
              funcConfig.function.transition_to = nextNode.data.label;
              break; // Use first valid target found
            }
          }
        }

        functions.push(funcConfig);
      } else if (targetNode.type === 'mergeNode') {
        // Find all functions that connect to this merge node
        const connectedFunctions = nodes.filter(n => {
          if (n.type !== 'functionNode') return false;
          
          // Check if this function node connects to the merge node
          return edges.some(e => e.source === n.id && e.target === targetNode.id);
        });

        // Find the final target of the merge node
        const mergeOutEdge = edges.find(e => e.source === targetNode.id);
        if (!mergeOutEdge) continue;

        const finalNode = nodes.find(n => n.id === mergeOutEdge.target);
        if (!finalNode) continue;

        // Add all functions with their transition to the final target
        connectedFunctions.forEach(funcNode => {
          const funcConfig = {
            type: "function",
            function: {
              ...funcNode.data.properties.function,
              transition_to: finalNode.data.label
            }
          };

          functions.push(funcConfig);
        });
      }
    }

    return functions;
  }

  // Build the flow configuration using the start node's title as initial_node
  const flowConfig = {
    initial_node: startNode.data.label,
    nodes: {} as Record<string, any>
  };

  // Process all nodes (except function and merge nodes which are handled differently)
  nodes.forEach(node => {
    if (node.type === 'functionNode' || node.type === 'mergeNode') {
      return;
    }

    // Create node configuration
    const nodeConfig: Record<string, any> = {
      task_messages: node.data.properties.task_messages,
      functions: findConnectedFunctions(node)
    };

    // Add role_messages if present (only on start nodes)
    if (node.data.properties.role_messages && node.data.properties.role_messages.length > 0) {
      nodeConfig.role_messages = node.data.properties.role_messages;
    }

    // Add actions if present
    if (node.data.properties.pre_actions && node.data.properties.pre_actions?.length > 0) {
      nodeConfig.pre_actions = node.data.properties.pre_actions;
    }
    if (node.data.properties.post_actions && node.data.properties.post_actions?.length > 0) {
      nodeConfig.post_actions = node.data.properties.post_actions;
    }

    // Use node label as the node ID
    flowConfig.nodes[node.data.label] = nodeConfig;
  });

  return flowConfig;
}
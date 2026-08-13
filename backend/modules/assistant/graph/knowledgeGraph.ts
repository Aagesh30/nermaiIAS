export type EntityType = 'BATCH' | 'TEACHER' | 'COURSE' | 'SUBJECT' | 'TOPIC' | 'RESOURCE' | 'LIVE_SESSION' | 'ASSIGNMENT' | 'ANNOUNCEMENT';

export interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  metadata?: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string; // e.g., 'BELONGS_TO', 'TAUGHT_BY', 'HAS_RESOURCE'
}

/**
 * KnowledgeGraph natively understands the relationships between entities
 * in the NERMAI Academy ecosystem to assist with relational queries.
 */
export class KnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];

  /**
   * Adds or updates a node in the graph.
   */
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  /**
   * Defines a relationship between two nodes.
   */
  addEdge(sourceId: string, targetId: string, relation: string): void {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      // In a strict environment we might throw, but since graph building 
      // can be async, we just warn or ignore.
      return;
    }
    this.edges.push({ source: sourceId, target: targetId, relation });
  }

  /**
   * Finds all related nodes of a target type connected to a starting node.
   * Enables: "Show resources (target) for this live class (source)"
   */
  getRelatedNodes(sourceId: string, targetType: EntityType, maxDepth: number = 2): GraphNode[] {
    const visited = new Set<string>();
    const results: GraphNode[] = [];
    
    // Breadth-First Search
    const queue: Array<{ id: string, depth: number }> = [{ id: sourceId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const node = this.nodes.get(current.id);
      if (node && node.type === targetType && current.id !== sourceId) {
        results.push(node);
      }

      if (current.depth < maxDepth) {
        // Find all edges where current is either source or target
        const neighbors = this.edges
          .filter(e => e.source === current.id || e.target === current.id)
          .map(e => (e.source === current.id ? e.target : e.source));
        
        for (const neighbor of neighbors) {
          queue.push({ id: neighbor, depth: current.depth + 1 });
        }
      }
    }

    return results;
  }
}

export const knowledgeGraph = new KnowledgeGraph();

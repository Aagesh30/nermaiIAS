import { IKnowledgePlugin } from '../types';

export class ToolRegistry {
  private plugins: Map<string, IKnowledgePlugin> = new Map();

  /**
   * Registers a plugin dynamically.
   * Plugins are validated before registration.
   */
  register(plugin: IKnowledgePlugin): void {
    if (!plugin.name) {
      throw new Error('Plugin must have a name to be registered.');
    }
    
    // Check dependencies (rudimentary validation)
    if (plugin.dependencies && plugin.dependencies.length > 0) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          // Warning: In a real system, you might want to defer registration
          // or resolve dependencies in a topological sort phase.
          // For now, we just warn.
          console.warn(`[ToolRegistry] Plugin ${plugin.name} depends on ${dep}, which is not yet registered.`);
        }
      }
    }

    this.plugins.set(plugin.name, plugin);
    console.log(`[ToolRegistry] Registered plugin: ${plugin.name} (Priority: ${plugin.priority})`);
  }

  /**
   * Retrieves all registered plugins, sorted by priority (highest first).
   */
  getAllPlugins(): IKnowledgePlugin[] {
    return Array.from(this.plugins.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Retrieves plugins that declare support for a specific intent.
   */
  getPluginsForIntent(intentName: string): IKnowledgePlugin[] {
    return this.getAllPlugins().filter(p => p.supportedIntents.includes(intentName));
  }

  /**
   * Retrieves a specific plugin by name.
   */
  getPlugin(name: string): IKnowledgePlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Gets the overall health of the Knowledge Engine by checking all plugins.
   */
  getRegistryHealth() {
    const healthData: Record<string, any> = {};
    let totalErrors = 0;

    for (const [name, plugin] of this.plugins.entries()) {
      const health = plugin.getHealth();
      healthData[name] = health;
      totalErrors += health.errors;
    }

    return {
      status: totalErrors > 10 ? 'degraded' : 'ok',
      plugins: healthData,
      registeredCount: this.plugins.size
    };
  }
}

// Singleton instance for global access
export const toolRegistry = new ToolRegistry();

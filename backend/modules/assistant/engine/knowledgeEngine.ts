import { IConversationSession, IPluginResult } from '../types';
import { intentEngine } from './intentEngine';
import { contextEngine } from '../context/contextEngine';
import { toolRegistry } from '../registry/toolRegistry';
import { searchIndex } from '../search/searchIndex';
import { commandEngine } from './commandEngine';
import { responseEnhancer } from './responseEnhancer';
import { assistantAnalytics, IAnalyticsLog } from '../analytics/assistantAnalytics';
import { ResponseBuilder, IAssistantResponse } from '../responseBuilder';

export class KnowledgeEngine {

  /**
   * The core orchestrator of the V2 Architecture.
   * Processes a query through the Context -> Intent -> Graph -> Plugin -> Search -> Formatter pipeline.
   */
  async processQuery(query: string, session: IConversationSession): Promise<IAssistantResponse> {
    const startTime = Date.now();
    let finalIntent = 'UNKNOWN';
    let finalConfidence = 0;
    let usedPlugins: string[] = [];
    let success = false;

    try {
      // 1. Analyze Context (Resolves pronouns and implicit scope)
      const contextModifiers = contextEngine.analyzeContext(query, session);

      // 2. Detect Intent & Confidence
      const { intent, confidence } = await intentEngine.detectIntent(query, session, session.tenantId);
      finalIntent = intent;
      finalConfidence = confidence;

      // 3. Command Routing (If intent is a direct command)
      if (intent.startsWith('/')) {
        const actionResult = await commandEngine.executeCommand(intent, 'ACTION', query, session);
        success = actionResult.status === 'success';
        
        const response = ResponseBuilder.buildActionCard(
          'Command Executed', 
          actionResult.message, 
          actionResult.data?.actions || []
        );
        this.log(query, intent, confidence, [], startTime, success, session);
        return responseEnhancer.enhance(response, session);
      }

      // 4. Plugin Routing via Tool Registry
      const plugins = toolRegistry.getPluginsForIntent(intent);
      let rawResults: IPluginResult[] = [];

      if (plugins.length > 0 && confidence >= 50) {
        // High confidence: Route to specific plugins
        usedPlugins = plugins.map(p => p.name);
        
        // Execute plugins in parallel
        const pluginPromises = plugins.map(p => p.execute('SEARCH', query, session).catch(e => {
          console.error(`[KnowledgeEngine] Plugin ${p.name} failed:`, e);
          return [];
        }));
        
        const resultsArray = await Promise.all(pluginPromises);
        rawResults = resultsArray.flat();
      } else {
        // Low confidence (Fallback to Universal Search Index across ALL SEARCH plugins)
        finalIntent = 'GENERAL_SEARCH';
        const allPlugins = toolRegistry.getAllPlugins().filter(p => p.capabilities.SEARCH?.includes(session.role));
        usedPlugins = allPlugins.map(p => p.name);

        const pluginPromises = allPlugins.map(p => p.execute('SEARCH', query, session).catch(() => []));
        const resultsArray = await Promise.all(pluginPromises);
        rawResults = resultsArray.flat();
      }

      // 5. Rank Results using Weighted Search Index
      const rankedResults = await searchIndex.rankResults(query, session.tenantId, rawResults);

      // 6. Format Response
      let rawResponse: IAssistantResponse;
      if (rankedResults.length > 0) {
        success = true;
        // Assume first result dictates the type for simplicity, or we build a generic list
        rawResponse = ResponseBuilder.buildResourceList(
          'Search Results',
          `Found ${rankedResults.length} matching items.`,
          rankedResults.slice(0, 10) // Limit to top 10
        );
      } else {
        rawResponse = ResponseBuilder.buildUnanswered();
      }

      this.log(query, finalIntent, finalConfidence, usedPlugins, startTime, success, session);

      // 7. Enhance (Pass-through for future LLM integration)
      return await responseEnhancer.enhance(rawResponse, session);

    } catch (error) {
      console.error('[KnowledgeEngine] Pipeline failure:', error);
      this.log(query, finalIntent, finalConfidence, usedPlugins, startTime, false, session);
      return ResponseBuilder.buildError('An unexpected error occurred while processing your request.');
    }
  }

  private log(
    query: string, intent: string, confidence: number, pluginsUsed: string[], 
    startTime: number, success: boolean, session: IConversationSession
  ) {
    const latency = Date.now() - startTime;
    assistantAnalytics.logInteraction({
      tenantId: session.tenantId,
      userId: session.userId,
      query,
      intent,
      confidence,
      pluginsUsed,
      latencyMs: latency,
      success,
      timestamp: new Date().toISOString()
    });
  }
}

export const knowledgeEngine = new KnowledgeEngine();

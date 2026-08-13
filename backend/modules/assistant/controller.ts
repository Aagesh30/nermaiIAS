import { Request, Response, NextFunction } from 'express';
import { ContextService } from './contextService';
import { IntentRouter } from './intentRouter';
import { KnowledgeService } from './knowledgeService';
import { ResponseBuilder, IAssistantResponse } from './responseBuilder';
import { AssistantEngine } from './assistantEngine';
import { UniversalSearchService } from './universalSearch';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';

// --- V2 Imports (kept behind feature flag, not removed) ---
import { knowledgeEngine } from './engine/knowledgeEngine';
import { sessionManager } from './sessions/conversationSession';

// --- LLM Imports ---
import { LLMFactory } from './llm/LLMFactory';
import { LLMRateLimiter } from './llm/LLMRateLimiter';
import { KnowledgeBaseService } from '../knowledge-base/service';
import { assistantHealthService } from './llm/health/HealthService';

const contextService = new ContextService();
const intentRouter = new IntentRouter();
const knowledgeService = new KnowledgeService();
const assistantEngine = new AssistantEngine();
const universalSearch = new UniversalSearchService();
const kbService = new KnowledgeBaseService();

const chatSchema = z.object({
  query: z.string().max(5000, "Query cannot exceed 5000 characters").optional(),
  message: z.string().max(5000, "Message cannot exceed 5000 characters").optional(),
  language: z.string().max(10).default('en')
}).transform(data => ({
  query: (data.query || data.message || '').trim(),
  language: data.language
})).refine(data => data.query.length > 0, { message: "Query or message is required" });

export class AssistantController {

  static async setContext(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.user!;
      await contextService.setContext(userId, req.body);
      res.status(200).json({ status: 'success' });
    } catch (err) { next(err); }
  }

  /**
   * 9-TIER DETERMINISTIC SEARCH PIPELINE
   *
   * Tier 1: Slash Commands         (/help, /courses, /live, etc.)
   * Tier 2: Intent Dictionary       (exact + keyword match from Firestore)
   * Tier 3: Ordinal Resolution      ("open the first one")
   * Tier 4–8: Knowledge Base Search  (via knowledgeService: exact, alias, synonym, tag, keyword, category)
   *   embedded in the Knowledge Service's own 10-tier search
   * Tier 6: Course Context Match    (articles filtered by activeCourseId)
   * Tier 7: Universal Search        (courses, subjects, topics, resources, FAQs)
   * Tier 8: Log Unanswered Query    (ALWAYS logged before any LLM call)
   * Tier 9: Optional LLM Fallback   (only if ENABLE_LLM_FALLBACK=true AND tenant allows it)
   */
  static async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, userId, role } = req.user! as any;
      const { query, language } = chatSchema.parse(req.body);

      // ─── V2 ENGINE (Feature Flag — kept for future migration) ────────────────
      if (process.env.ASSISTANT_ENGINE === 'v2') {
        const session = await sessionManager.getOrCreateSession(
          `${userId}_default`,
          userId,
          tenantId,
          role || 'student'
        );
        const v2Response = await knowledgeEngine.processQuery(query, session);
        await sessionManager.updateSession(session.sessionId, {
          conversation: { lastQuery: query }
        });
        return res.status(200).json({ status: 'success', data: v2Response });
      }

      // ─── TIER 1: Slash Commands ──────────────────────────────────────────────
      if (query.startsWith('/')) {
        const intentName = query.substring(1).toLowerCase().trim();
        const responsePayload = await AssistantController.handleIntent(intentName, tenantId, userId, language);
        return res.status(200).json({ status: 'success', data: responsePayload });
      }

      // ─── TIER 2: Conversation Memory & Ordinal Resolution ───────────────────
      const memory = await contextService.getMemory(userId);
      const context = memory.context;

      // "open the second one" etc.
      const resolvedItem = await contextService.resolveOrdinal(query, userId);
      if (resolvedItem) {
        const responsePayload = ResponseBuilder.buildText(`Opening: ${resolvedItem.title}`);
        responsePayload.actions = [{ type: 'OPEN_RESOURCE', payload: resolvedItem } as any];
        await contextService.updateMemory(userId, { query, intent: 'ordinal_open', results: [] });
        return res.status(200).json({ status: 'success', data: responsePayload });
      }

      // ─── TIER 2: Intent Dictionary Match ────────────────────────────────────
      const matches = await intentRouter.routeQuery(query, tenantId);
      let responsePayload: IAssistantResponse | null = null;

      if (matches.length > 0 && matches[0].confidence >= 90) {
        // High confidence intent → direct answer
        responsePayload = await AssistantController.handleIntent(matches[0].name, tenantId, userId, language);

        await contextService.updateMemory(userId, {
          query,
          intent: matches[0].name,
          results: responsePayload?.items || []
        });

        return res.status(200).json({ status: 'success', data: responsePayload });
      }

      // ─── TIERS 3–7: Universal Search (KB + Context + Courses + Resources) ───
      const searchResults = await universalSearch.search(query, tenantId, context as any);

      if (searchResults.length > 0) {
        responsePayload = searchResults[0];

        await contextService.updateMemory(userId, {
          query,
          intent: 'universal_search',
          results: responsePayload?.items || []
        });

        return res.status(200).json({ status: 'success', data: responsePayload });
      }

      // ─── TIER 8: Log Unanswered Query (ALWAYS — even if LLM is next) ────────
      await getFirestore().collection('unanswered_queries').add({
        tenantId,
        userId,
        query,
        context,
        timestamp: new Date().toISOString()
      });

      // ─── TIER 9: Optional LLM Fallback ──────────────────────────────────────
      const llmEnabled = process.env.ENABLE_LLM_FALLBACK === 'true';

      if (llmEnabled) {
        // Check tenant-level LLM setting from Firestore
        const tenantSettings = await kbService.getSettings(tenantId);
        const tenantAllowsLLM = (tenantSettings as any).enableLLMFallback === true;

        if (tenantAllowsLLM) {
          // Rate limit check
          const rateCheck = await LLMRateLimiter.checkAndIncrement(
            tenantId,
            (tenantSettings as any).llmDailyLimit
          );

          if (!rateCheck.allowed) {
            responsePayload = ResponseBuilder.buildText(rateCheck.reason!);
          } else {
            // Call LLM (query already logged to unanswered_queries above)
            const assistantContext = { tenantId, userId, role: role || 'student', language };
            const aiResponse = await assistantEngine.llmFallback(query, context as any, assistantContext);

            if (aiResponse) {
              responsePayload = ResponseBuilder.buildText(aiResponse);
            }
          }
        }
      }

      // Default fallback if LLM is off or produced nothing
      if (!responsePayload) {
        responsePayload = ResponseBuilder.buildText(
          "I couldn't find an exact answer. Your question has been sent to the academy administrators."
        );
      }

      await contextService.updateMemory(userId, {
        query,
        intent: 'fallback',
        results: []
      });

      res.status(200).json({ status: 'success', data: responsePayload });
    } catch (err) { next(err); }
  }

  /**
   * Admin Preview — simulates the pipeline for a query without saving memory.
   */
  static async previewSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, role, userId } = req.user! as any;
      const { query, language } = chatSchema.parse(req.body);
      const start = Date.now();

      // --- V2 ENGINE (kept behind feature flag) ---
      if (process.env.ASSISTANT_ENGINE === 'v2') {
        const session = await sessionManager.getOrCreateSession(
          `${userId || 'preview'}_preview`,
          userId || 'preview-user',
          tenantId,
          role || 'admin'
        );
        const v2Response = await knowledgeEngine.processQuery(query, session);
        return res.status(200).json({
          status: 'success',
          data: {
            response: v2Response,
            diagnostics: { matchedVia: 'V2_KNOWLEDGE_ENGINE', latencyMs: Date.now() - start }
          }
        });
      }

      // Simulate V1 pipeline
      let responsePayload: IAssistantResponse | null = null;
      let matchedVia = 'Tier 8: Fallback (no match)';
      let confidence = 0;

      if (query.startsWith('/')) {
        const intentName = query.substring(1).toLowerCase().trim();
        responsePayload = await AssistantController.handleIntent(intentName, tenantId, 'preview-user', language);
        matchedVia = 'Tier 1: Slash Command';
        confidence = 100;
      } else {
        const matches = await intentRouter.routeQuery(query, tenantId);
        if (matches.length > 0 && matches[0].confidence >= 90) {
          responsePayload = await AssistantController.handleIntent(matches[0].name, tenantId, 'preview-user', language);
          matchedVia = `Tier 2: Intent Dictionary — "${matches[0].name}"`;
          confidence = matches[0].confidence;
        } else {
          const searchResults = await universalSearch.search(query, tenantId, {} as any);
          if (searchResults.length > 0) {
            responsePayload = searchResults[0];
            matchedVia = 'Tiers 3–7: Universal Search (KB / Courses / Resources)';
            confidence = 75;
          } else {
            matchedVia = process.env.ENABLE_LLM_FALLBACK === 'true'
              ? 'Tier 8–9: Logged + LLM Fallback (if tenant-enabled)'
              : 'Tier 8: Logged — Default Fallback (LLM disabled)';
          }
        }
      }

      res.status(200).json({
        status: 'success',
        data: {
          response: responsePayload,
          diagnostics: {
            matchedVia,
            confidence,
            latencyMs: Date.now() - start,
            engineVersion: process.env.ASSISTANT_ENGINE || 'v1',
            llmEnabled: process.env.ENABLE_LLM_FALLBACK === 'true',
            llmProvider: LLMFactory.getProviderName(),
          }
        }
      });
    } catch (err) { next(err); }
  }

  /**
   * Sync — returns a content pack for mobile SQLite offline caching.
   */
  static async syncKnowledge(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const since = req.query.since as string;
      const contentPack = await knowledgeService.getContentPack(tenantId, since);
      res.status(200).json({ status: 'success', data: contentPack });
    } catch (err) { next(err); }
  }

  /**
   * Health — checks KB and LLM provider connectivity.
   * GET /api/assistant/health
   */
  static async health(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const healthStatus = await assistantHealthService.check(tenantId);
      const httpCode = healthStatus.status === 'unhealthy' ? 503 : 200;
      res.status(httpCode).json({ status: 'success', data: healthStatus });
    } catch (err) { next(err); }
  }

  // ─── Intent Handler (Slash Commands) ──────────────────────────────────────────
  private static async handleIntent(
    intentName: string, tenantId: string, userId: string, language: string
  ): Promise<IAssistantResponse> {
    const normalized = intentName.toLowerCase();
    const memory = await contextService.getMemory(userId);

    switch (normalized) {
      case 'courses':
        return ResponseBuilder.buildResourceList('My Courses', 'Quick access to your enrolled courses.', [
          { title: 'My Enrolled Courses', type: 'View Module', intent: '/view_courses' }
        ]);

      case 'notes':
      case 'resources':
        const resources = await knowledgeService.searchResources(normalized, tenantId, memory.context as any);
        return ResponseBuilder.buildResourceList("Today's Notes", 'Based on your recent classes.', resources);

      case 'live':
        return ResponseBuilder.buildResourceList('Live Classes', 'Upcoming live sessions.', [
          { title: 'View Schedule', type: 'Link', intent: '/view_live_schedule' }
        ]);

      case 'attendance':
        return ResponseBuilder.buildText('Attendance module quick action: View your overall attendance percentage.');

      case 'hallticket':
      case 'tests':
      case 'payments':
      case 'profile':
      case 'certificates':
        return ResponseBuilder.buildText(`The **${normalized.toUpperCase()}** module is coming soon! This quick action will be available shortly.`);

      case 'announcements':
        return ResponseBuilder.buildResourceList('Recent Announcements', 'Important updates from the academy.', [
          { title: 'Open Announcements Portal', type: 'Link', intent: '/view_announcements' }
        ]);

      case 'help':
      case 'faq':
        const knowledgeTop = await knowledgeService.searchKnowledgePlatform('', tenantId, memory.context as any);
        const items = knowledgeTop.slice(0, 5).map(r => {
          const tr = r.article.translations[language] || r.article.translations['en'];
          return { title: tr?.title, answer: tr?.content };
        });
        return { type: 'faq', title: 'Knowledge Base Top Articles', items };
    }

    // Default: Knowledge Platform search
    const knowledgeResults = await knowledgeService.searchKnowledgePlatform(normalized, tenantId, memory.context as any);
    if (knowledgeResults.length > 0) {
      const bestFaq = knowledgeResults[0].article;
      const translation = bestFaq.translations[language] || bestFaq.translations['en'];
      if (translation) {
        return ResponseBuilder.buildFAQ(translation.title, translation.content);
      }
    }

    return ResponseBuilder.buildText(
      `I understand you're asking about "${intentName}", but I don't have detailed info yet.`
    );
  }
}

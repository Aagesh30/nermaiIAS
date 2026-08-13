import { CourseService } from '../courses/service';
import { ResourceService } from '../resources/service';
import { AnnouncementService } from '../announcements/service';
import { KnowledgeService } from './knowledgeService';
import { IStudentContext } from './contextService';
import { IAssistantResponse } from './responseBuilder';

export class UniversalSearchService {
  private courseService = new CourseService();
  private resourceService = new ResourceService();
  private announcementService = new AnnouncementService();
  private knowledgeService = new KnowledgeService();

  async search(query: string, tenantId: string, context: IStudentContext | null): Promise<IAssistantResponse[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery || normalizedQuery.length < 2) return [];

    const results: Array<{ title: string; type: string; id: string }> = [];

    // 1. Search Courses, Subjects, Topics, Classes
    const [courses, subjects, topics, classes] = await Promise.all([
      this.courseService.listCourses(tenantId),
      this.courseService.listAllSubjects(tenantId),
      this.courseService.listAllTopics(tenantId),
      this.courseService.listAllClasses(tenantId)
    ]);

    courses.forEach(c => {
      if (c.name.toLowerCase().includes(normalizedQuery) || c.description?.toLowerCase().includes(normalizedQuery)) {
        results.push({ title: c.name, type: 'course', id: c.id! });
      }
    });

    subjects.forEach(s => {
      if (s.name.toLowerCase().includes(normalizedQuery)) {
        results.push({ title: s.name, type: 'subject', id: s.id! });
      }
    });

    topics.forEach(t => {
      if (t.name.toLowerCase().includes(normalizedQuery)) {
        results.push({ title: t.name, type: 'topic', id: t.id! });
      }
    });

    classes.forEach(c => {
      if (c.title.toLowerCase().includes(normalizedQuery)) {
        results.push({ title: c.title, type: c.classType.includes('live') ? 'live class' : 'recorded class', id: c.id! });
      }
    });

    // 2. Search Resources
    const resources = await this.resourceService.listResources({ tenantId });
    resources.forEach(r => {
      if (r.title.toLowerCase().includes(normalizedQuery) || r.description?.toLowerCase().includes(normalizedQuery)) {
        results.push({ title: r.title, type: r.type || 'resource', id: r.id! });
      }
    });

    // 3. Search Announcements
    // If context is missing, we pass empty arrays
    const announcements = await this.announcementService.list(
      tenantId, 
      'student', 
      { batchIds: [], courseIds: context?.activeCourseId ? [context.activeCourseId] : [] }
    );
    
    announcements.forEach(a => {
      if (a.title.toLowerCase().includes(normalizedQuery) || a.content.toLowerCase().includes(normalizedQuery)) {
        results.push({ title: a.title, type: 'announcement', id: a.id! });
      }
    });

    // 4. Search Knowledge Platform (replaces FAQs)
    const knowledgeResults = await this.knowledgeService.searchKnowledgePlatform(query, tenantId, context);
    
    const responses: IAssistantResponse[] = [];

    // Combine Knowledge Articles into FAQ/Article cards
    if (knowledgeResults.length > 0) {
      responses.push({
        type: 'faq',
        title: 'Top Answers from Knowledge Base',
        items: knowledgeResults.slice(0, 5).map(result => ({
          title: result.article.translations?.en?.title || result.article.category,
          answer: result.article.translations?.en?.content || 'Answer available.'
        }))
      });
    }

    // Combine everything else into a Resource List
    if (results.length > 0) {
      responses.push({
        type: 'resource_list',
        title: 'Search Results',
        subtitle: `Found ${results.length} results across the academy.`,
        items: results.slice(0, 10) // Limit to top 10 to avoid huge UI cards
      });
    }

    return responses;
  }
}

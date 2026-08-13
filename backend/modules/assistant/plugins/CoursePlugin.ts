import { IKnowledgePlugin, IPluginCapabilities, IPluginHealth, IConversationSession, IPluginResult } from '../types';
import { CourseService } from '../../courses/service';

export class CoursePlugin implements IKnowledgePlugin {
  name = 'CoursePlugin';
  priority = 80;
  supportedIntents = ['COURSE_INFO'];
  dependencies = [];
  capabilities: IPluginCapabilities = {
    SEARCH: ['student', 'teacher', 'admin'],
    LOOKUP: ['student', 'teacher', 'admin'],
    NAVIGATION: ['student', 'teacher', 'admin'],
    ACTION: ['admin']
  };

  private courseService = new CourseService();

  getHealth(): IPluginHealth {
    return {
      status: 'ok',
      latencyMs: 15,
      cacheHits: 0,
      errors: 0,
      version: '1.0.0'
    };
  }

  async execute(action: string, payload: any, session: IConversationSession): Promise<IPluginResult[]> {
    if (action === 'SEARCH') {
      const courses = await this.courseService.listCourses(session.tenantId);
      
      return courses.map(c => ({
        id: c.id!,
        type: 'course',
        title: c.name,
        subtitle: c.description,
        score: 50,
        actions: [{ type: 'OPEN_COURSE', label: 'View Course' }]
      }));
    }
    
    throw new Error(`Action ${action} not supported by ${this.name}`);
  }
}

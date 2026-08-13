import { extractKeywords } from './keywordSearch.util';

export type Intent = 'faq' | 'academic' | 'support' | 'unknown';

export class IntentClassifier {
  private faqKeywords = new Set(['fee', 'timing', 'login', 'password', 'contact', 'support', 'help', 'join', 'certificate']);
  private academicKeywords = new Set(['course', 'subject', 'topic', 'class', 'video', 'note', 'pdf', 'syllabus', 'learn', 'teach']);

  classify(query: string): Intent {
    const keywords = extractKeywords(query);
    
    let faqScore = 0;
    let academicScore = 0;

    for (const keyword of keywords) {
      if (this.faqKeywords.has(keyword)) faqScore++;
      if (this.academicKeywords.has(keyword)) academicScore++;
    }

    if (faqScore > academicScore && faqScore > 0) return 'faq';
    if (academicScore > faqScore && academicScore > 0) return 'academic';
    
    // Default to unknown, triggering a broad search
    return 'unknown';
  }
}

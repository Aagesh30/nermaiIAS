import * as XLSX from 'xlsx';

export interface ParsedSubtopic {
  name: string;
  order: number;
  facultyName?: string;
  dateOfClass?: string;
  classNo?: number;
  durationHrs?: number;
  mode?: string;
  batchSection?: string;
  coverageStatus?: string;
  percentCovered?: number;
  testConducted?: string;
  testDate?: string;
  avgScore?: number;
  remarks?: string;
}

export interface ParsedTopic {
  name: string;
  order: number;
  subtopics: ParsedSubtopic[];
}

export interface ParsedSubject {
  name: string;
  order: number;
  topics: ParsedTopic[];
  totalSubtopics: number;
}

export interface ParsedSyllabusResult {
  subjects: ParsedSubject[];
  stats: {
    totalSubjects: number;
    totalTopics: number;
    totalSubtopics: number;
  };
  fileName: string;
}

/**
 * Parses an Excel Workbook (.xlsx, .xls) containing course syllabus sheets
 * into a structured hierarchy of Subject -> Topic -> Subtopic.
 */
export async function parseSyllabusFile(file: File): Promise<ParsedSyllabusResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const subjects: ParsedSubject[] = [];
  let subjectOrder = 1;

  const ignoreSheetNames = ['master syllabus', 'dashboard', 'summary', 'index', 'overview', 'instructions', 'template'];

  for (const sheetName of workbook.SheetNames) {
    const trimmedSheetName = String(sheetName).trim();
    if (!trimmedSheetName) continue;

    // If workbook has multiple sheets, skip aggregate/overview sheets
    if (workbook.SheetNames.length > 1 && ignoreSheetNames.includes(trimmedSheetName.toLowerCase())) {
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rawRows || rawRows.length < 2) continue;

    // Detect header row (locate 'Topic' and 'Sub-topic' / 'Subtopic')
    let headerRowIndex = -1;
    let topicColIndex = -1;
    let subtopicColIndex = -1;
    let facultyColIndex = -1;
    let dateColIndex = -1;
    let classNoColIndex = -1;
    let durationColIndex = -1;
    let modeColIndex = -1;
    let batchColIndex = -1;
    let coverageColIndex = -1;
    let percentColIndex = -1;
    let testConductedColIndex = -1;
    let testDateColIndex = -1;
    let avgScoreColIndex = -1;
    let remarksColIndex = -1;

    for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;

      const tIdx = row.findIndex(c => typeof c === 'string' && /^topic$/i.test(c.trim()));
      const stIdx = row.findIndex(c => typeof c === 'string' && /sub[- _]?topic/i.test(c.trim()));

      if (tIdx !== -1 && stIdx !== -1) {
        headerRowIndex = i;
        topicColIndex = tIdx;
        subtopicColIndex = stIdx;

        // Map supplementary columns
        row.forEach((colVal, colIdx) => {
          if (typeof colVal !== 'string') return;
          const h = colVal.toLowerCase().replace(/\s+/g, ' ');
          if (h.includes('faculty')) facultyColIndex = colIdx;
          else if (h.includes('date of class') || h.includes('class date') || h.includes('date')) dateColIndex = colIdx;
          else if (h.includes('class no') || h.includes('class #')) classNoColIndex = colIdx;
          else if (h.includes('duration') || h.includes('hrs') || h.includes('hours')) durationColIndex = colIdx;
          else if (h.includes('mode')) modeColIndex = colIdx;
          else if (h.includes('batch') || h.includes('section')) batchColIndex = colIdx;
          else if (h.includes('coverage') || h.includes('status')) coverageColIndex = colIdx;
          else if (h.includes('%') || h.includes('percent')) percentColIndex = colIdx;
          else if (h.includes('test conducted')) testConductedColIndex = colIdx;
          else if (h.includes('test date')) testDateColIndex = colIdx;
          else if (h.includes('avg score') || h.includes('score')) avgScoreColIndex = colIdx;
          else if (h.includes('remark') || h.includes('note')) remarksColIndex = colIdx;
        });
        break;
      }
    }

    if (headerRowIndex === -1 || topicColIndex === -1 || subtopicColIndex === -1) {
      // Fallback: check if row 0 or 1 has headers without strict regex
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i];
        if (!Array.isArray(row)) continue;
        const tIdx = row.findIndex(c => typeof c === 'string' && c.toLowerCase().includes('topic') && !c.toLowerCase().includes('sub'));
        const stIdx = row.findIndex(c => typeof c === 'string' && c.toLowerCase().includes('sub'));
        if (tIdx !== -1 && stIdx !== -1) {
          headerRowIndex = i;
          topicColIndex = tIdx;
          subtopicColIndex = stIdx;
          break;
        }
      }
    }

    if (headerRowIndex === -1 || topicColIndex === -1 || subtopicColIndex === -1) {
      continue; // Skip non-syllabus sheets
    }

    const topicsMap = new Map<string, ParsedTopic>();
    let currentTopicName = '';

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawTopic = row[topicColIndex];
      const rawSubtopic = row[subtopicColIndex];

      if (rawTopic !== undefined && rawTopic !== null && String(rawTopic).trim()) {
        currentTopicName = String(rawTopic).trim();
      }

      if (!currentTopicName) continue;

      if (!topicsMap.has(currentTopicName)) {
        topicsMap.set(currentTopicName, {
          name: currentTopicName,
          order: topicsMap.size + 1,
          subtopics: []
        });
      }

      if (rawSubtopic !== undefined && rawSubtopic !== null && String(rawSubtopic).trim()) {
        const subtopicName = String(rawSubtopic).trim();
        const topicObj = topicsMap.get(currentTopicName)!;

        topicObj.subtopics.push({
          name: subtopicName,
          order: topicObj.subtopics.length + 1,
          facultyName: facultyColIndex !== -1 && row[facultyColIndex] ? String(row[facultyColIndex]).trim() : undefined,
          dateOfClass: dateColIndex !== -1 && row[dateColIndex] ? String(row[dateColIndex]).trim() : undefined,
          classNo: classNoColIndex !== -1 && row[classNoColIndex] ? Number(row[classNoColIndex]) || 0 : undefined,
          durationHrs: durationColIndex !== -1 && row[durationColIndex] ? Number(row[durationColIndex]) || 0 : undefined,
          mode: modeColIndex !== -1 && row[modeColIndex] ? String(row[modeColIndex]).trim() : undefined,
          batchSection: batchColIndex !== -1 && row[batchColIndex] ? String(row[batchColIndex]).trim() : undefined,
          coverageStatus: coverageColIndex !== -1 && row[coverageColIndex] ? String(row[coverageColIndex]).trim() : 'Pending',
          percentCovered: percentColIndex !== -1 && row[percentColIndex] ? Number(row[percentColIndex]) || 0 : 0,
          testConducted: testConductedColIndex !== -1 && row[testConductedColIndex] ? String(row[testConductedColIndex]).trim() : undefined,
          testDate: testDateColIndex !== -1 && row[testDateColIndex] ? String(row[testDateColIndex]).trim() : undefined,
          avgScore: avgScoreColIndex !== -1 && row[avgScoreColIndex] ? Number(row[avgScoreColIndex]) || 0 : undefined,
          remarks: remarksColIndex !== -1 && row[remarksColIndex] ? String(row[remarksColIndex]).trim() : undefined
        });
      }
    }

    const topicsArray = Array.from(topicsMap.values());
    if (topicsArray.length > 0) {
      const totalSubtopics = topicsArray.reduce((acc, t) => acc + t.subtopics.length, 0);
      subjects.push({
        name: trimmedSheetName,
        order: subjectOrder++,
        topics: topicsArray,
        totalSubtopics
      });
    }
  }

  const totalTopics = subjects.reduce((acc, s) => acc + s.topics.length, 0);
  const totalSubtopics = subjects.reduce((acc, s) => acc + s.totalSubtopics, 0);

  return {
    subjects,
    stats: {
      totalSubjects: subjects.length,
      totalTopics,
      totalSubtopics
    },
    fileName: file.name
  };
}

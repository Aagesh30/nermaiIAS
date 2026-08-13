const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = path.join(__dirname, '..', 'Nermai_Faculty_Tracker (2).xlsx');
const workbook = XLSX.readFile(excelPath);

console.log('Parsing sheets...');

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  console.log(`\n================ ${sheetName} (${rows.length} rows) ================`);
  
  let currentTopic = '';
  const parsedData = [];
  
  rows.forEach((row, idx) => {
    // Determine the keys
    const keys = Object.keys(row);
    const sNoKey = keys.find(k => k.startsWith('NERMAI IAS ACADEMY') || k.includes('S.No'));
    const topicKey = '__EMPTY';
    const subtopicKey = '__EMPTY_1';
    
    const sNo = row[sNoKey];
    
    // Ignore the header row (S.No, Topic, Sub-topic) if it's there
    if (sNo === 'S.No') return;
    
    const topicVal = row[topicKey];
    const subtopicVal = row[subtopicKey];
    
    if (topicVal) {
      currentTopic = String(topicVal).trim();
    }
    
    if (!subtopicVal) return; // Skip if no subtopic
    
    const subtopicName = String(subtopicVal).trim();
    
    // Extract other fields based on standard columns
    const faculty = row['__EMPTY_2'] ? String(row['__EMPTY_2']).trim() : '';
    const dateOfClass = row['__EMPTY_3'] ? String(row['__EMPTY_3']).trim() : '';
    const classNo = row['__EMPTY_4'] ? Number(row['__EMPTY_4']) : 0;
    const duration = row['__EMPTY_5'] ? Number(row['__EMPTY_5']) : 0;
    const mode = row['__EMPTY_6'] ? String(row['__EMPTY_6']).trim() : '';
    const batch = row['__EMPTY_7'] ? String(row['__EMPTY_7']).trim() : '';
    const coverage = row['__EMPTY_8'] ? String(row['__EMPTY_8']).trim() : '';
    const pctCovered = row['__EMPTY_9'] ? Number(row['__EMPTY_9']) : 0;
    const testConducted = row['__EMPTY_10'] ? String(row['__EMPTY_10']).trim() : '';
    const testDate = row['__EMPTY_11'] ? String(row['__EMPTY_11']).trim() : '';
    const avgScore = row['__EMPTY_12'] ? Number(row['__EMPTY_12']) : 0;
    const remarks = row['__EMPTY_13'] ? String(row['__EMPTY_13']).trim() : '';
    
    parsedData.push({
      topic: currentTopic || 'General',
      subtopic: subtopicName,
      faculty,
      dateOfClass,
      classNo,
      duration,
      mode,
      batch,
      coverage,
      pctCovered,
      testConducted,
      testDate,
      avgScore,
      remarks
    });
  });
  
  console.log(`Parsed ${parsedData.length} subtopics.`);
  console.log('Sample parsed item:', parsedData[0]);
  
  // Count unique topics
  const uniqueTopics = [...new Set(parsedData.map(d => d.topic))];
  console.log('Unique Topics:', uniqueTopics);
});

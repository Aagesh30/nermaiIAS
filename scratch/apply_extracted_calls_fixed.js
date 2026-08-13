const fs = require('fs');
const path = require('path');

const cleanAppPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_clean.tsx');
const toolCallsPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'extracted_tool_calls.json');

if (!fs.existsSync(cleanAppPath)) {
  console.error("App_clean.tsx does not exist!");
  process.exit(1);
}

if (!fs.existsSync(toolCallsPath)) {
  console.error("extracted_tool_calls.json does not exist!");
  process.exit(1);
}

let content = fs.readFileSync(cleanAppPath, 'utf8');
const toolCalls = JSON.parse(fs.readFileSync(toolCallsPath, 'utf8'));

console.log(`Initial file length: ${content.length} characters`);

function normalizeString(str) {
  if (typeof str !== 'string') return '';
  // If the string is double-stringified (starts and ends with quote), parse it
  let parsed = str;
  if (str.startsWith('"') && str.endsWith('"')) {
    try {
      parsed = JSON.parse(str);
    } catch (e) {
      // fallback
    }
  }
  // Standardize line endings to LF
  return parsed.replace(/\r\n/g, '\n').trim();
}

function normalizeFileContent(str) {
  return str.replace(/\r\n/g, '\n');
}

toolCalls.forEach((call, index) => {
  const targetFile = normalizeString(call.args.TargetFile);
  const isRootApp = targetFile && 
                    (targetFile.toLowerCase().endsWith('app.tsx') || targetFile.toLowerCase().endsWith('app.tsx"')) && 
                    !targetFile.toLowerCase().includes('web_portal') && 
                    !targetFile.toLowerCase().includes('mobile');
  
  if (!isRootApp) {
    return;
  }

  console.log(`\n--- Applying Call #${index + 1} (${call.toolName}) ---`);
  
  if (call.toolName === 'replace_file_content') {
    const target = normalizeString(call.args.TargetContent);
    const replacement = normalizeString(call.args.ReplacementContent);
    
    let fileContent = normalizeFileContent(content);
    
    // Try exact match first
    if (fileContent.includes(target)) {
      content = fileContent.replace(target, replacement);
      console.log("SUCCESS: Single replacement applied.");
    } else {
      // Try match with whitespace normalization
      const targetNoSpaces = target.replace(/\s+/g, '');
      const idx = fileContent.replace(/\s+/g, '').indexOf(targetNoSpaces);
      if (idx !== -1) {
        console.log("Found match with whitespace differences, trying fuzzy match...");
        // Let's find the exact starting index in fileContent
        // We can do a sliding window or a simple regex. Since it's a unique block, let's find the line range
        // For simplicity, let's look for a subset of the target that exists exactly
        const firstLine = target.split('\n')[0].trim();
        const firstLineIdx = fileContent.indexOf(firstLine);
        if (firstLineIdx !== -1) {
          // Let's see if we can find the target around it
          // We can replace the target by matching firstLine and lastLine
          const lastLine = target.split('\n').pop().trim();
          const lastLineIdx = fileContent.indexOf(lastLine, firstLineIdx);
          if (lastLineIdx !== -1) {
            const matchLength = lastLineIdx + lastLine.length - firstLineIdx;
            const matchedText = fileContent.substring(firstLineIdx, firstLineIdx + matchLength);
            content = fileContent.replace(matchedText, replacement);
            console.log("SUCCESS: Fuzzy replacement applied.");
            return;
          }
        }
      }
      console.warn(`WARNING: TargetContent not found!`);
      console.log("Target length:", target.length);
      console.log("Target Content preview:\n" + target.substring(0, 200));
    }
  } else if (call.toolName === 'multi_replace_file_content') {
    const chunks = call.args.ReplacementChunks;
    const parsedChunks = typeof chunks === 'string' ? JSON.parse(chunks) : chunks;
    if (Array.isArray(parsedChunks)) {
      parsedChunks.forEach((chunk, chunkIdx) => {
        const target = normalizeString(chunk.TargetContent);
        const replacement = normalizeString(chunk.ReplacementContent);
        
        let fileContent = normalizeFileContent(content);
        if (fileContent.includes(target)) {
          content = fileContent.replace(target, replacement);
          console.log(`SUCCESS: Chunk #${chunkIdx + 1} applied.`);
        } else {
          console.warn(`WARNING: Chunk #${chunkIdx + 1} TargetContent not found!`);
          console.log("Target length:", target.length);
          console.log("Target Content preview:\n" + target.substring(0, 200));
        }
      });
    }
  }
});

const outputPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_reconstructed.tsx');
fs.writeFileSync(outputPath, content, 'utf8');
console.log(`\nReconstructed file written to ${outputPath} (Length: ${content.length} characters)`);

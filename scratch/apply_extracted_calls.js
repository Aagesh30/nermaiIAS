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
  // Replace Windows newlines with Unix newlines for consistent matching
  return str.replace(/\r\n/g, '\n');
}

toolCalls.forEach((call, index) => {
  const targetFile = call.args.TargetFile;
  // We only target the root App.tsx
  const isRootApp = targetFile && 
                    (targetFile.toLowerCase().endsWith('app.tsx') || targetFile.toLowerCase().endsWith('app.tsx"')) && 
                    !targetFile.toLowerCase().includes('web_portal') && 
                    !targetFile.toLowerCase().includes('mobile');
  
  if (!isRootApp) {
    // Skip changes to mobile/App.tsx or web_portal/App.tsx for now
    return;
  }

  console.log(`\n--- Applying Call #${index + 1} (${call.toolName}) from Conv ${call.conversationId} Step ${call.stepIndex} ---`);
  
  if (call.toolName === 'replace_file_content') {
    const target = normalizeString(call.args.TargetContent);
    const replacement = normalizeString(call.args.ReplacementContent);
    
    const normalizedFileContent = normalizeString(content);
    if (normalizedFileContent.includes(target)) {
      content = normalizedFileContent.replace(target, replacement);
      console.log("SUCCESS: Single replacement applied.");
    } else {
      console.warn(`WARNING: TargetContent not found!`);
      console.log("TargetContent start:", JSON.stringify(target.substring(0, 100)));
    }
  } else if (call.toolName === 'multi_replace_file_content') {
    const chunks = call.args.ReplacementChunks;
    if (Array.isArray(chunks)) {
      chunks.forEach((chunk, chunkIdx) => {
        const target = normalizeString(chunk.TargetContent);
        const replacement = normalizeString(chunk.ReplacementContent);
        
        const normalizedFileContent = normalizeString(content);
        if (normalizedFileContent.includes(target)) {
          content = normalizedFileContent.replace(target, replacement);
          console.log(`SUCCESS: Chunk #${chunkIdx + 1} applied.`);
        } else {
          console.warn(`WARNING: Chunk #${chunkIdx + 1} TargetContent not found!`);
          console.log("TargetContent start:", JSON.stringify(target.substring(0, 100)));
        }
      });
    }
  }
});

const outputPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_reconstructed.tsx');
fs.writeFileSync(outputPath, content, 'utf8');
console.log(`\nReconstructed file written to ${outputPath} (Length: ${content.length} characters)`);

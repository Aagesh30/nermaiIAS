const fs = require('fs');
const path = require('path');

const cleanPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_clean.tsx');
const activePath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');

const cleanContent = fs.readFileSync(cleanPath, 'utf8');
const activeContent = fs.readFileSync(activePath, 'utf8');

function getFunctions(content) {
  const lines = content.split('\n');
  const funcs = [];
  lines.forEach((line, idx) => {
    if (line.includes('const ') || line.includes('function ')) {
      if (line.includes('=>') || line.includes('(')) {
        funcs.push({ lineNum: idx + 1, content: line.trim() });
      }
    }
  });
  return funcs;
}

const cleanFuncs = getFunctions(cleanContent);
const activeFuncs = getFunctions(activeContent);

console.log(`Clean functions count: ${cleanFuncs.length}`);
console.log(`Active functions count: ${activeFuncs.length}`);

console.log('\n--- Active Functions not in Clean (or shifted) ---');
activeFuncs.forEach(af => {
  const match = cleanFuncs.find(cf => cf.content === af.content);
  if (!match) {
    console.log(`Active Line ${af.lineNum}: ${af.content}`);
  }
});

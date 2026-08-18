const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    if (dir.includes('node_modules') || dir.includes('.next') || dir.includes('.expo')) return results;
    
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir(path.join(process.cwd(), 'backend'));
let count = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Pattern 1: if (!admin.apps.length) { admin.initializeApp({...}); }
    const regex1 = /if\s*\(\!admin\.apps\.length\)\s*\{\s*admin\.initializeApp\(\{(?:[^{}]*|\{[^{}]*\})*\}\);\s*\}/g;
    content = content.replace(regex1, '');

    // Pattern 2: admin.initializeApp({ ... });
    // Be careful not to match the one in infrastructure/firebase/index.ts
    if (!file.includes('infrastructure\\\\firebase\\\\index.ts') && !file.includes('infrastructure/firebase/index.ts')) {
        const regex2 = /admin\.initializeApp\(\{(?:[^{}]*|\{[^{}]*\})*\}\);?/g;
        content = content.replace(regex2, '');
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', file);
        count++;
    }
}
console.log('Updated ' + count + ' files.');

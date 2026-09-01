const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'web_portal', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = '["All", "ERP", "LMS", "CRM", "TEST", "DEVELOPER"]';
const replacement = '["All", "ERP", "ACCESS CONTROL", "LEARNING", "MATERIALS", "LMS MANAGEMENT", "AI STUDIO", "CRM", "Test Portal", "System"]';

if (content.includes(target)) {
    // Replace all occurrences
    content = content.split(target).join(replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated categories in App.tsx');
} else {
    console.log('Target array not found in App.tsx');
}

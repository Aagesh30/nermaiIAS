const fs = require('fs');

const files = ['App.tsx', 'web_portal/App.tsx', 'mobile/App.tsx'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    console.log(`${f}: size = ${content.length} characters`);
    
    // Find some key blocks
    const hasGuest = content.includes('if (user?.role === "guest")');
    const hasDev = content.includes('if (user?.role === "developer")');
    const hasMainBody = content.includes('styles.mainBody');
    const hasAuth = content.includes('styles.authContainer');
    
    console.log(`  hasGuest: ${hasGuest}, hasDev: ${hasDev}, hasMainBody: ${hasMainBody}, hasAuth: ${hasAuth}`);
  } else {
    console.log(`${f} does not exist`);
  }
});

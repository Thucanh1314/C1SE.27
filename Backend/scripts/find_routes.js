const fs = require('fs');
const path = require('path');

function searchRoutes(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            searchRoutes(fullPath);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes("router.put('/questions") || content.includes("router.post('/questions") || content.includes("app.put('/questions")) {
                console.log(`Found in: ${fullPath}`);
                const lines = content.split('\n');
                lines.forEach((line, i) => {
                    if (line.includes('/questions') && (line.includes('.post') || line.includes('.put'))) {
                        console.log(`Line ${i + 1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

console.log('Searching for Question Routes...');
searchRoutes('d:/NCKH/Backend/src');

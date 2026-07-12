import fs from 'fs';
import path from 'path';

// Regex for emoji characters
const EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25B6}\u{23F8}-\u{23FA}]/u;

const TARGET_DIRS = [
  'web/src',
  'supabase/seed',
  'api/src/ai'
];

let hasError = false;

function scanDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (stat.isFile()) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (EMOJI_REGEX.test(content)) {
        console.error(`FAIL: Emoji found in ${fullPath}`);
        hasError = true;
      }
    }
  }
}

console.log('--- Starting Emoji Scan ---');
for (const dir of TARGET_DIRS) {
  scanDir(path.resolve(process.cwd(), dir));
}

if (hasError) {
  console.error('--- Emoji Scan FAILED ---');
  process.exit(1);
} else {
  console.log('--- Emoji Scan PASSED ---');
  console.log('RESULT: PASS');
}

import fs from 'fs';
const data = JSON.parse(fs.readFileSync('C:\\Users\\ANIRUDDH\\.gemini\\antigravity\\brain\\70003c6f-4382-418b-beee-a4335b509a12\\.system_generated\\steps\\362\\output.txt', 'utf-8'));
fs.mkdirSync('d:\\odoo\\web\\src\\types', { recursive: true });
fs.writeFileSync('d:\\odoo\\web\\src\\types\\database.ts', data.types);
console.log('Types extracted successfully');

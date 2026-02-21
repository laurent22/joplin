// Script to automatically inject a missing node-addon-api type stub into node_modules
// so that TypeScript compiler resolves the implicit type requirement during 'yarn tsc'
const fs = require('fs');
const path = require('path');

const typesDir = path.join(__dirname, '..', 'node_modules', '@types', 'node-addon-api');

if (!fs.existsSync(typesDir)) {
	fs.mkdirSync(typesDir, { recursive: true });
}

fs.writeFileSync(path.join(typesDir, 'index.d.ts'), 'declare module \'node-addon-api\';\n');

import { dirname, join } from 'path';

export const packagesDir = dirname(dirname(__dirname));
export const cliDirectory = join(packagesDir, 'app-cli');


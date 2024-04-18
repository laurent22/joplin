
import { dirname } from 'path';

export const mobileDir = dirname(dirname(__dirname));
export const outputDir = `${mobileDir}/lib/rnInjectedJs`;
export const rootDir = dirname(dirname(mobileDir));

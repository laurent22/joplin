/* eslint-disable no-console */

import { execCommand } from '@joplin/utils';
import * as fs from 'fs-extra';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default async function(args: any) {
    const pluginId = args.pluginId;
    const repoDir = args.pluginRepoDir;
    const pluginPath = path.resolve(repoDir, 'plugins', pluginId);

    if (!(await fs.pathExists(pluginPath))) {
        throw new Error(`Plugin not found at ${pluginPath}`);
    }

    console.info(`Analysing plugin with Docker: ${pluginId}...`);

    try {
        // running semgrep via docker
        const output = await execCommand([
            'docker', 'run', '--rm',
            '-v', `${pluginPath}:/src`,
            'returntocorp/semgrep',
            'semgrep',
            '--config', 'p/default',
            '--config', 'p/security-audit',
            '--config', 'p/javascript',
            '--config', 'p/typescript',
            '--error', 
            '/src'
        ]);
        console.info('No critical security issues found.');
        console.log(output);
    } catch (error) {
        if (error.message.includes('docker: command not found')) {
            console.error('Docker is not installed or running. Please ensure Docker is available.');
        } else {
            console.error('Security issues identified:');
            console.error(error.message);
        }
    }
}

import { execCommand } from '@joplin/utils';
import waitForCliInput from '../utils/waitForCliInput';
import { copy } from 'fs-extra';
import { join } from 'path';
import buildDefaultPlugins from '../buildDefaultPlugins';
import getPathToPatchFileFor from '../utils/getPathToPatchFileFor';

const editPatch = async (targetPluginId: string, outputParentDir: string|null) => {
	let patchedPlugin = false;

	await buildDefaultPlugins(outputParentDir, {
		beforePatch: async () => {
			// To make updating just the patch possible, a commit is created just before applying
			// the patch.
			await execCommand('git add .');
			await execCommand(['git', 'config', 'user.name', 'Build script']);
			await execCommand(['git', 'config', 'user.email', '']);
			await execCommand(['git', 'commit', '-m', 'Initial commit']);
		},
		beforeInstall: async (buildDir, pluginId) => {
			if (pluginId !== targetPluginId) {
				return;
			}

			// eslint-disable-next-line no-console
			console.log('Make changes to', buildDir, 'to create a patch.');
			await waitForCliInput();
			await execCommand(['sh', '-c', 'git diff -p > diff.diff']);

			await copy(join(buildDir, './diff.diff'), getPathToPatchFileFor(pluginId));

			patchedPlugin = true;
		},
	});

	if (!patchedPlugin) {
		throw new Error(`No default plugin with ID ${targetPluginId} found!`);
	}
};

export default editPatch;

import Logger from '@joplin/utils/Logger';
import shim from '../../shim';
import { PluginSettings } from '../plugins/PluginService';

const logger = Logger.create('seedNewProfilePluginStates');

// Writes a one-shot seed file `${rootProfileDir}/profile-${newProfileId}/initial-plugin-states.json`
// containing only `{ [pluginId]: { enabled } }` for each plugin in the source profile.
// Lifecycle flags (`deleted`, `hasBeenUpdated`) are intentionally dropped; a plugin
// marked as deleted is treated as disabled. The file is consumed and deleted by
// applyNewProfilePluginStates() inside the new profile's `firstStart` block.
export default async (rootProfileDir: string, newProfileId: string, sourcePluginStates: PluginSettings) => {
	try {
		const seeded: Record<string, { enabled: boolean }> = {};
		for (const pluginId of Object.keys(sourcePluginStates || {})) {
			const state = sourcePluginStates[pluginId] || ({} as { enabled?: boolean; deleted?: boolean });
			seeded[pluginId] = { enabled: Boolean(state.enabled) && !state.deleted };
		}

		const newProfileDir = `${rootProfileDir}/profile-${newProfileId}`;
		await shim.fsDriver().mkdir(newProfileDir);
		await shim.fsDriver().writeFile(
			`${newProfileDir}/initial-plugin-states.json`,
			JSON.stringify(seeded, null, '\t'),
			'utf8',
		);
	} catch (error) {
		logger.error('Could not seed plugin states for new profile:', error);
	}
};

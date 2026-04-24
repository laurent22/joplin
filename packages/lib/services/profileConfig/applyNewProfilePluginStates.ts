import Logger from '@joplin/utils/Logger';
import shim from '../../shim';
import Setting from '../../models/Setting';
import { PluginSettings } from '../plugins/PluginService';

const logger = Logger.create('applyNewProfilePluginStates');

// Consumes the seed written by seedNewProfilePluginStates(): reads the file,
// merges `{ enabled }` entries into `plugins.states`, persists via the normal
// Setting pipeline (DB on every platform), and deletes the file.
// Intended to be called once, inside the `firstStart` branch of the boot path.
export default async (profileDir: string) => {
	const seedPath = `${profileDir}/initial-plugin-states.json`;
	try {
		if (!(await shim.fsDriver().exists(seedPath))) return;

		const raw = await shim.fsDriver().readFile(seedPath, 'utf8');
		const seed = JSON.parse(raw) as Record<string, { enabled?: boolean }>;

		const current: PluginSettings = Setting.value('plugins.states') || {};
		const merged: PluginSettings = { ...current };
		for (const pluginId of Object.keys(seed || {})) {
			const existing = merged[pluginId] || ({} as PluginSettings[string]);
			merged[pluginId] = { ...existing, enabled: Boolean(seed[pluginId]?.enabled) };
		}

		Setting.setValue('plugins.states', merged);
		await Setting.saveAll();
	} catch (error) {
		logger.error('Could not apply initial plugin states for new profile:', error);
	} finally {
		try {
			await shim.fsDriver().remove(seedPath);
		} catch {
			// Ignore removal errors; missing-file is harmless and any other failure
			// will be retried on the next firstStart if one happens.
		}
	}
};

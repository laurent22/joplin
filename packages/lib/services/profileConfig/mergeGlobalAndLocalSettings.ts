import Logger from '../../Logger';
import Setting from '../../models/Setting';

const logger = Logger.create('mergeGlobalAndLocalSettings');

export default (rootSettings: Record<string, any>, subProfileSettings: Record<string, any>) => {
	const output: Record<string, any> = { ...subProfileSettings };

	for (const k of Object.keys(output)) {
		const md = Setting.settingMetadata(k);
		if (md.isGlobal) {
			delete output[k];
			if (k in rootSettings) output[k] = rootSettings[k];
		}
	}

	for (const k of Object.keys(rootSettings)) {
		try {
			const md = Setting.settingMetadata(k);
			if (md.isGlobal) {
				output[k] = rootSettings[k];
			}
		} catch (error) {
			if (error.code === 'unknown_key') {
				// The root settings may contain plugin parameters, but the
				// sub-profile won't necessarily have these plugins. In that
				// case, the app will throw an error, but we can ignore it since
				// we don't need this particular setting.
				// https://github.com/laurent22/joplin/issues/8143
				logger.info(`Ignoring unknown key in root settings: ${k}`);
			}
		}
	}

	return output;
};

import Setting from '../../models/Setting';

export default (rootSettings: Record<string, any>, subProfileSettings: Record<string, any>) => {
	const output: Record<string, any> = { ...subProfileSettings };

	for (const k of Object.keys(output)) {
		const md = Setting.settingMetadata(k);
		if (md.isLocal) {
			delete output[k];
			if (k in rootSettings) output[k] = rootSettings[k];
		}
	}

	for (const k of Object.keys(rootSettings)) {
		const md = Setting.settingMetadata(k);
		if (md.isLocal) {
			output[k] = rootSettings[k];
		}
	}

	return output;
};

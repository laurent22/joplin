import Setting, { MetadataItem } from 'lib/models/Setting';

export default class SandboxJoplinSettings {
	register(key:string, metadata:MetadataItem) {
		// TODO: validate key name
		return Setting.registerSetting(key, metadata);
	}
}

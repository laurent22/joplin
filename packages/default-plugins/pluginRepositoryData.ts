import { AllRepositoryData, AppType } from './types';

const pluginRepositoryData: AllRepositoryData = {
	'io.github.jackgruber.backup': {
		'cloneUrl': 'https://github.com/JackGruber/joplin-plugin-backup.git',
		'branch': 'master',
		'commit': 'bd49c665bf60c1e0dd9b9862b2ba69cad3d4c9ae',
		'appTypes': [AppType.Desktop],
	},
	// 'com.example.codemirror6-line-numbers': {
	// 	'path': 'packages/app-cli/tests/support/plugins/codemirror6',
	// 	'appTypes': [AppType.Mobile],
	// },
	// 'org.joplinapp.plugins.RegisterCommandDemo': {
	// 	'path': 'packages/app-cli/tests/support/plugins/register_command',
	// 	'appTypes': [AppType.Mobile],
	// },
	'org.joplinapp.plugins.DialogDemo': {
		'path': 'packages/app-cli/tests/support/plugins/dialog',
		'appTypes': [AppType.Mobile],
	},
};

export default pluginRepositoryData;

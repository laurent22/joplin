import { AllRepositoryData, AppType } from './types';

const pluginRepositoryData: AllRepositoryData = {
	'io.github.jackgruber.backup': {
		'cloneUrl': 'https://github.com/JackGruber/joplin-plugin-backup.git',
		'branch': 'master',
		'commit': '021085cc37ed83a91a7950744e462782e27c04a6',
		'appTypes': [AppType.Desktop],
	},
	'com.example.show-message-box-on-startup': {
		'path': 'packages/app-cli/tests/support/plugins/message_box',
		'appTypes': [AppType.Mobile],
	},
};

export default pluginRepositoryData;

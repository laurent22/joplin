import { AllRepositoryData, AppType } from './types';

const pluginRepositoryData: AllRepositoryData = {
	'io.github.jackgruber.backup': {
		'cloneUrl': 'https://github.com/JackGruber/joplin-plugin-backup.git',
		'branch': 'master',
		'commit': '2d814a5466604daced108331d14aedf8e8414d62',
		'appTypes': [AppType.Desktop],
	},
	'com.example.codemirror6-line-numbers': {
		'path': 'packages/app-cli/tests/support/plugins/codemirror6',
		'appTypes': [AppType.Mobile],
	},
	'org.joplinapp.plugins.TocDemo': {
		'path': 'packages/app-cli/tests/support/plugins/toc',
		'appTypes': [AppType.Mobile],
	},
};

export default pluginRepositoryData;

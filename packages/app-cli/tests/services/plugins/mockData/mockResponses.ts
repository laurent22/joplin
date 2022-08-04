import { supportDir } from '@joplin/lib/testing/test-utils';
import path = require('path');
const fs = require('fs');

const response1 = {
	'_id': 'joplin-plugin-rich-markdown',
	'name': 'joplin-plugin-rich-markdown',
	'versions': {
		'0.8.2': {
			'name': 'joplin-plugin-rich-markdown',
			'version': '0.8.2',
			'description': 'A plugin that will finally allow you to ditch the markdown viewer, saving space and making your life easier.',
			'_id': 'joplin-plugin-rich-markdown@0.1.0',
			'dist': {
				'tarball': 'no-link-here',
			},
		},
		'0.9.0': {
			'name': 'joplin-plugin-rich-markdown',
			'version': '0.9.0',
			'dist': {
				'tarball': `${path.join(supportDir, '..', 'services', 'plugins', 'mockData', 'richMarkdown.tgz')}`,
			},
		},
	},
};

const response2 = {
	'_id': 'io.github.jackgruber.backup',
	'name': 'joplin-plugin-rich-markdown',
	'versions': {
		'1.0.0': {
			'name': 'joplin-plugin-rich-markdown',
			'version': '1.0.0',
			'description': 'A plugin that will finally allow you to ditch the markdown viewer, saving space and making your life easier.',
			'_id': 'joplin-plugin-rich-markdown@0.1.0',
			'dist': {
				'tarball': 'no-link-here',
			},
		},
		'1.1.0': {
			'name': 'joplin-plugin-rich-markdown',
			'version': '1.1.0',
			'dist': {
				'tarball': `${path.join(supportDir, '..', 'services', 'plugins', 'mockData', 'simpleBackup.tgz')}`,
			},
		},
	},
};

export const manifests = {
	'io.github.jackgruber.backup': {
		'manifest_version': 1,
		'id': 'io.github.jackgruber.backup',
		'app_min_version': '2.1.3',
		'version': '1.1.0',
		'name': 'Simple Backup',
		'description': 'Plugin to create manual and automatic backups.',
		'author': 'JackGruber',
		'homepage_url': 'https://github.com/JackGruber/joplin-plugin-backup/blob/master/README.md',
		'repository_url': 'https://github.com/JackGruber/joplin-plugin-backup',
		'keywords': [
			'backup',
			'jex',
			'export',
			'zip',
			'7zip',
			'encrypted',
		],
		'_publish_hash': 'sha256:8d8c6a3bb92fafc587269aea58b623b05242d42c0766a05bbe25c3ba2bbdf8ee',
		'_publish_commit': 'master:00ed52133c659e0f3ac1a55f70b776c42fca0a6d',
		'_npm_package_name': 'joplin-plugin-backup',
	},
	'plugin.calebjohn.rich-markdown': {
		'manifest_version': 1,
		'id': 'plugin.calebjohn.rich-markdown',
		'app_min_version': '2.7',
		'version': '0.9.0',
		'name': 'Rich Markdown',
		'description': 'Helping you ditch the markdown viewer for good.',
		'author': 'Caleb John',
		'homepage_url': 'https://github.com/CalebJohn/joplin-rich-markdown#readme',
		'repository_url': 'https://github.com/CalebJohn/joplin-rich-markdown',
		'keywords': [
			'editor',
			'visual',
		],
		'_publish_hash': 'sha256:95337a3868aebdc9bf8c347a37460d0c2753b391ff51a0c72bdccdef9679705f',
		'_publish_commit': 'main:af3493b6ca96c931327ab3bd04906faaed0c782c',
		'_npm_package_name': 'joplin-plugin-rich-markdown',
	},

};

export async function mockFile() {
	const filePath = path.join(__dirname, 'richMarkdown.tgz');
	const someFile = await fs.readFileSync(filePath, 'utf8');
	return { buffer: () => someFile };
}

export const NPM_Response1 = JSON.stringify(response1);
export const NPM_Response2 = JSON.stringify(response2);


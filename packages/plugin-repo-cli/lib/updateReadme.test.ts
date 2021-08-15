import * as fs from 'fs-extra';
import updateReadme from './updateReadme';

describe('updateReadme', () => {

	test('should update the README file', async () => {
		const manifests: any = {
			'io.github.jackgruber.copytags': {
				'manifest_version': 1,
				'id': 'io.github.jackgruber.copytags',
				'app_min_version': '1.6.2',
				'version': '1.0.1',
				'name': 'Tagging',
				'description': 'Plugin to extend the Joplin tagging menu with a coppy all tags and a tagging dialog with more control. (Formerly Copy Tags).',
				'author': 'JackGruber',
				'homepage_url': 'https://github.com/JackGruber/joplin-plugin-tagging/blob/master/README.md',
				'repository_url': 'https://github.com/JackGruber/joplin-plugin-tagging',
				'keywords': [
					'duplicate',
					'copy',
					'tags',
					'tagging',
					'tag',
				],
				'_publish_hash': 'sha256:88daaf234a9b47e5644a8de6f830a801d12edbe41ea5364d994773e89eeafeef',
				'_publish_commit': 'master:64c0510e3236df7788a8d10ec28dcfbb4c2bdbb7',
				'_npm_package_name': 'joplin-plugin-copytags',
			},
			'joplin.plugin.ambrt.backlinksToNote': {
				'manifest_version': 1,
				'id': 'joplin.plugin.ambrt.backlinksToNote',
				'app_min_version': '1.7',
				'version': '2.0.10',
				'name': 'Automatic Backlinks to note',
				'description': 'Creates backlinks to opened note, also in automatic way',
				'author': 'ambrt',
				'homepage_url': 'https://discourse.joplinapp.org/t/insert-referencing-notes-backlinks-plugin/13632',
				'_publish_hash': 'sha256:b5dec8d00f19e34c4fe1dc0ed380b6743aa7debfd8f600ead0d6866ba21466f1',
				'_publish_commit': 'master:05020664a6a7f567c466e3fbad1d7e7ec64dc369',
				'_npm_package_name': 'joplin-plugin-backlinks',
			},
		};

		const tempFilePath = `${__dirname}/test_README.md`;
		await fs.writeFile(tempFilePath, '<!-- PLUGIN_LIST -->\n<!-- PLUGIN_LIST -->');

		await updateReadme(tempFilePath, manifests);

		const content = await fs.readFile(tempFilePath, 'utf8');

		// Check header
		expect(content.includes('| &nbsp; | &nbsp; | Name  | Version | Description | Author |')).toBe(true);

		// Check plugin content
		expect(content.includes('https://github.com/JackGruber/joplin-plugin-tagging/blob/master/README.md')).toBe(true);
		expect(content.includes('https://github.com/joplin/plugins/raw/master/plugins/joplin.plugin.ambrt.backlinksToNote/plugin.jpl')).toBe(true);
		expect(content.includes('Automatic Backlinks to note')).toBe(true);
		expect(content.includes('2.0.10')).toBe(true);
		expect(content.includes('Creates backlinks to opened note, also in automatic way')).toBe(true);
		expect(content.includes('ambrt')).toBe(true);

		// Check that it keeps the markers
		expect(content.split('<!-- PLUGIN_LIST -->').length - 1).toBe(2);

		await fs.remove(tempFilePath);
	});

});

import { applyManifestOverrides, getObsoleteManifests, ManifestOverrides } from './overrideUtils';

describe('overrideUtils', () => {

	test('should get the obsolete manifests', () => {
		const manifestOverrides: any = {
			'ambrt.backlinksToNote': {
				'manifest_version': 1,
				'id': 'ambrt.backlinksToNote',
				'app_min_version': '1.5',
				'version': '1.0.2',
				'name': 'Backlinks to note',
				'description': 'Creates backlinks to opened note',
				'author': 'a',
				'homepage_url': 'https://discourse.joplinapp.org/t/insert-referencing-notes-backlinks-plugin/13632',
				'_publish_hash': 'sha256:5676da6b9ad71fc5a9779d3bde13f17de5352344711e135f0db8c62c6dbb5696',
				'_publish_commit': 'master:19e515bd67e51cc37bd270a32d2898ca009a0de2',
				'_npm_package_name': 'joplin-plugin-backlinks',
				'_obsolete': true,
			},
			'MyPlugin': {
				'manifest_version': 1,
				'id': 'MyPlugin',
				'app_min_version': '1.6',
				'version': '1.0.0',
				'name': 'Testing New Plugin',
				'description': 'bla',
				'author': 'bla',
				'homepage_url': 'bla',
				'repository_url': 'bla',
				'_publish_hash': 'sha256:065285d06ea3c084e7f8f8c23583de8d70c4d586274a242c4c750f6faad8c7cb',
				'_publish_commit': '',
				'_npm_package_name': 'joplin-plugin-testing-new-plugin',
				'_obsolete': true,
			},
			'io.github.jackgruber.copytags': {
				'_recommended': true,
			},
		};

		const obsoletes = getObsoleteManifests(manifestOverrides);
		expect(Object.keys(obsoletes).sort()).toEqual(['MyPlugin', 'ambrt.backlinksToNote']);
		expect(obsoletes['ambrt.backlinksToNote'].description).toBe('Creates backlinks to opened note');
	});

	test('should apply the overrides', () => {
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
				'version': '2.0.11',
				'name': 'Automatic Backlinks to note',
				'description': 'Creates backlinks to opened note, also in automatic way',
				'author': 'ambrt,cyingfan',
				'homepage_url': 'https://discourse.joplinapp.org/t/insert-referencing-notes-backlinks-plugin/13632',
				'_publish_hash': 'sha256:df57930d1ab62d4297dad0bb1764888935fcbf6ca8c04e3a843e86a260735c51',
				'_publish_commit': 'master:98102718a9c0fa9416d654451b18602798c4d3bb',
				'_npm_package_name': 'joplin-plugin-backlinks',
			},
		};

		const overrides: ManifestOverrides = {
			'io.github.jackgruber.copytags': {
				_recommended: true,
			},
		};

		const updatedManifests = applyManifestOverrides(manifests, overrides);
		expect(updatedManifests['io.github.jackgruber.copytags']._recommended).toBe(true);
		expect(updatedManifests['joplin.plugin.ambrt.backlinksToNote']._recommended).toBe(undefined);
	});

});

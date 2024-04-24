import applyManifestDefaults, { ManifestDefaults } from './applyManifestDefaults';


const testManifests = {
	'com.example.some.id.here': {
		'manifest_version': 1,
		'id': 'com.example.some.id.here',
		'app_min_version': '2.10',
		'version': '2.9.1',
		'name': 'Test',
		'description': 'A test plugin',
		'keywords': [
			'drawing',
			'freehand-drawing',
			'freehand',
			'handwriting',
		],
		'categories': [
			'editor',
		],
		'_publish_hash': 'sha256:0739686b11c848b9abe5ca08fba9626eb7eb7fab1cd57d92687afef02e06bd86',
		'_publish_commit': 'master:fba9e01a0de67fea3adc6674e85b4706829f4756',
	},
	'org.joplinapp.plugins.Victor': {
		'manifest_version': 1,
		'id': 'org.joplinapp.plugins.Victor',
		'app_min_version': '2.2',
		'version': '1.0.3',
		'name': 'Victor',
		'description': 'Victor can be used to clear all your data - notes, notebooks, attachments, tags, etc. Convenient to start over.',
		'author': 'Laurent Cozic',
		'homepage_url': 'https://github.com/joplin/plugin-victor#readme',
		'repository_url': 'https://github.com/joplin/plugin-victor',
		'categories': ['developer tools', 'productivity'],
		'icons': {},
	},
} as const;

describe('applyManifestDefaults', () => {
	test('should allow setting a default value for the "platforms" field', () => {
		const defaults: ManifestDefaults = {
			'com.example.some.id.here': {
				platforms: ['desktop'],
			},
		};

		expect(applyManifestDefaults(testManifests, defaults)).toMatchObject({
			'com.example.some.id.here': {
				...testManifests['com.example.some.id.here'],
				platforms: ['desktop'],
			},
			'org.joplinapp.plugins.Victor': testManifests['org.joplinapp.plugins.Victor'],
		});
	});

	test('should allow overriding a default value for a field', () => {
		const defaults: ManifestDefaults = {
			'org.joplinapp.plugins.Victor': {
				platforms: ['desktop'],
			},
		};

		const originalManifest = {
			...testManifests['org.joplinapp.plugins.Victor'],
			platforms: ['mobile', 'desktop'],
		};
		const manifests = {
			...testManifests,
			'org.joplinapp.plugins.Victor': originalManifest,
		};

		const updatedManifest = applyManifestDefaults(manifests, defaults)['org.joplinapp.plugins.Victor'];
		expect(updatedManifest).toMatchObject({
			...testManifests['org.joplinapp.plugins.Victor'],
			platforms: ['mobile', 'desktop'],
		});
	});
});

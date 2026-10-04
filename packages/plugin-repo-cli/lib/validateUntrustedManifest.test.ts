
import validateUntrustedManifest from './validateUntrustedManifest';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';

const originalManifests = {
	'joplin-plugin.this.is.a.test': {
		id: 'joplin-plugin.this.is.a.test',
		_npm_package_name: 'joplin-plugin-this-is-a-test',
		version: '0.0.1',
	},
} as unknown as Record<string, PluginManifest>;

// Note: Most of the checks below have additional tests in other files.
// This test suite is primarily to ensure that the checks are present.

describe('validateUntrustedManifest', () => {
	test('should only allow valid plugin IDs', () => {
		const badManifest = {
			id: 'bad',
			_npm_package_name: 'joplin-plugin-test',
			version: '1.2.34',
		};

		expect(
			() => validateUntrustedManifest(badManifest as unknown as PluginManifest, originalManifests, { source: 'npm' }),
		).toThrow('ID cannot be shorter than');


		const goodManifest = {
			...badManifest,
			id: 'this.plugin.has.a.better.id',
		};

		expect(
			() => validateUntrustedManifest(goodManifest as unknown as PluginManifest, originalManifests, { source: 'npm' }),
		).not.toThrow();
	});

	test('should only allow valid plugin versions', () => {
		const badManifest = {
			id: 'joplin-plugin.this.is.a.test',
			_npm_package_name: 'joplin-plugin-this-is-a-test',
			version: 'bad!',
		};

		expect(
			() => validateUntrustedManifest(badManifest as unknown as PluginManifest, originalManifests, { source: 'npm' }),
		).toThrow();


		const goodManifest = {
			...badManifest,
			version: '0.0.2',
		};

		expect(
			() => validateUntrustedManifest(goodManifest as unknown as PluginManifest, originalManifests, { source: 'npm' }),
		).not.toThrow();
	});

	test('should only allow valid plugin platforms', () => {
		const badManifest = {
			id: 'com.example.a-plugin-for-a-fake-platform',
			_npm_package_name: 'joplin-plugin-plugin-for-an-invalid-version',
			version: '1.2.3',
			platforms: [3, 4, 5],
		};

		expect(
			() => validateUntrustedManifest(badManifest as unknown as PluginManifest, originalManifests, { source: 'npm' }),
		).toThrow();

		const goodManifest = {
			...badManifest,
			platforms: ['mobile', 'desktop'],
		};

		expect(
			() => validateUntrustedManifest(goodManifest as unknown as PluginManifest, originalManifests, { source: 'npm' }),
		).not.toThrow();
	});

	test('should not allow plugin authors to mark their own plugins as recommended', () => {
		const newManifest1 = {
			id: 'joplin-plugin.this.is.another.test',
			_recommended: true,
			_npm_package_name: 'joplin-plugin-another-test',
			version: '1.2.3',
		};

		expect(
			() => validateUntrustedManifest(newManifest1 as unknown as PluginManifest, originalManifests, { source: 'npm' }),
		).toThrow('mark itself as recommended');

		// Should also throw for falsey values
		const newManifest2 = {
			id: 'joplin-plugin.yet.another.test',
			_recommended: '',
			_npm_package_name: 'another-test',
			version: '1.2.3',
		};

		expect(
			() => validateUntrustedManifest(newManifest2 as unknown as PluginManifest, originalManifests, { source: 'npm' }),
		).toThrow('mark itself as recommended');
	});

	test('should not allow changing the NPM package for an existing plugin', () => {
		const newManifest = {
			id: 'joplin-plugin.this.is.a.test',
			_npm_package_name: 'joplin-plugin-test',
			version: '0.0.2',
		};

		expect(
			() => validateUntrustedManifest(newManifest as unknown as PluginManifest, originalManifests, { source: 'npm' }),
		).toThrow();
	});

	test('should allow the same npm package to register its first repository URL', () => {
		const newManifest = {
			id: 'joplin-plugin.this.is.a.test',
			_npm_package_name: 'joplin-plugin-this-is-a-test',
			repository_url: 'https://github.com/example/this-is-a-test',
			version: '0.0.2',
		};

		expect(
			() => validateUntrustedManifest(
				newManifest as unknown as PluginManifest,
				originalManifests,
				{ source: 'npm' },
			),
		).not.toThrow();
	});

	test('should require the same npm package after repository ownership is registered', () => {
		const manifestsWithRepository = {
			'joplin-plugin.this.is.a.test': {
				...originalManifests['joplin-plugin.this.is.a.test'],
				repository_url: 'https://github.com/example/this-is-a-test',
			},
		};
		const newManifest = {
			id: 'joplin-plugin.this.is.a.test',
			_npm_package_name: 'joplin-plugin-attacker',
			repository_url: 'https://github.com/example/this-is-a-test',
			version: '0.0.2',
		};

		expect(
			() => validateUntrustedManifest(
				newManifest as unknown as PluginManifest,
				manifestsWithRepository,
				{ source: 'npm' },
			),
		).toThrow('has already been published under npm package');
	});

	test('should not allow the npm package to change an established repository URL', () => {
		const manifestsWithRepository = {
			'joplin-plugin.this.is.a.test': {
				...originalManifests['joplin-plugin.this.is.a.test'],
				repository_url: 'https://github.com/example/this-is-a-test',
			},
		};
		const newManifest = {
			id: 'joplin-plugin.this.is.a.test',
			_npm_package_name: 'joplin-plugin-this-is-a-test',
			repository_url: 'https://github.com/attacker/this-is-a-test',
			version: '0.0.2',
		};

		expect(
			() => validateUntrustedManifest(
				newManifest as unknown as PluginManifest,
				manifestsWithRepository,
				{ source: 'npm' },
			),
		).toThrow('has already been published under repository');
	});

	test('should reject an unverified repository migration for a legacy npm plugin', () => {
		const newManifest = {
			id: 'joplin-plugin.this.is.a.test',
			repository_url: 'https://github.com/attacker/this-is-a-test',
			version: '0.0.2',
		};

		expect(
			() => validateUntrustedManifest(
				newManifest as unknown as PluginManifest,
				originalManifests,
				{ source: 'repository' },
			),
		).toThrow('A maintainer must verify and register its repository URL');
	});

	test('should require a repository URL for repository submissions', () => {
		const manifest = {
			id: 'com.example.repository-plugin',
			version: '1.0.0',
		};

		expect(
			() => validateUntrustedManifest(
				manifest as unknown as PluginManifest,
				originalManifests,
				{ source: 'repository' },
			),
		).toThrow('must specify repository_url');
	});

	test('should not accept an npm package name from a repository submission', () => {
		const manifest = {
			id: 'com.example.repository-plugin',
			version: '1.0.0',
			repository_url: 'https://github.com/example/repository-plugin',
			_npm_package_name: 'copied-package-name',
		};

		expect(
			() => validateUntrustedManifest(
				manifest as unknown as PluginManifest,
				originalManifests,
				{ source: 'repository' },
			),
		).toThrow('cannot specify _npm_package_name');
	});

	test('should accept a new repository submission with a repository URL', () => {
		const manifest = {
			id: 'com.example.repository-plugin',
			version: '1.0.0',
			repository_url: 'https://github.com/example/repository-plugin',
		};

		expect(
			() => validateUntrustedManifest(
				manifest as unknown as PluginManifest,
				originalManifests,
				{ source: 'repository' },
			),
		).not.toThrow();
	});
});

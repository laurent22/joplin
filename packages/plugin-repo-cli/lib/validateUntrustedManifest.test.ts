
import validateUntrustedManifest from './validateUntrustedManifest';

const originalManifests = {
	'joplin-plugin.this.is.a.test': {
		id: 'joplin-plugin.this.is.a.test',
		_npm_package_name: 'joplin-plugin-this-is-a-test',
		version: '0.0.1',
	},
};

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
			() => validateUntrustedManifest(badManifest, originalManifests),
		).toThrow('ID cannot be shorter than');


		const goodManifest = {
			...badManifest,
			id: 'this.plugin.has.a.better.id',
		};

		expect(
			() => validateUntrustedManifest(goodManifest, originalManifests),
		).not.toThrow();
	});

	test('should only allow valid plugin versions', () => {
		const badManifest = {
			id: 'joplin-plugin.this.is.a.test',
			_npm_package_name: 'joplin-plugin-this-is-a-test',
			version: 'bad!',
		};

		expect(
			() => validateUntrustedManifest(badManifest, originalManifests),
		).toThrow();


		const goodManifest = {
			...badManifest,
			version: '0.0.2',
		};

		expect(
			() => validateUntrustedManifest(goodManifest, originalManifests),
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
			() => validateUntrustedManifest(badManifest, originalManifests),
		).toThrow();

		const goodManifest = {
			...badManifest,
			platforms: ['mobile', 'desktop'],
		};

		expect(
			() => validateUntrustedManifest(goodManifest, originalManifests),
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
			() => validateUntrustedManifest(newManifest1, originalManifests),
		).toThrow('mark itself as recommended');

		// Should also throw for falsey values
		const newManifest2 = {
			id: 'joplin-plugin.yet.another.test',
			_recommended: '',
			_npm_package_name: 'another-test',
			version: '1.2.3',
		};

		expect(
			() => validateUntrustedManifest(newManifest2, originalManifests),
		).toThrow('mark itself as recommended');
	});

	test('should not allow changing the NPM package for an existing plugin', () => {
		const newManifest = {
			id: 'joplin-plugin.this.is.a.test',
			_npm_package_name: 'joplin-plugin-test',
			version: '0.0.2',
		};

		expect(
			() => validateUntrustedManifest(newManifest, originalManifests),
		).toThrow();
	});
});

import checkIfPluginCanBeAdded from './checkIfPluginCanBeAdded';

describe('checkIfPluginCanBeAdded', () => {

	test('should not add if already a plugin with this ID but different package name', () => {
		const testCases = [
			[
				{
					'test': {
						id: 'test',
						_npm_package_name: 'original',
					},
				},
				{
					id: 'test',
					_npm_package_name: 'original',
				},
				true,
			],
			[
				{
					'test': {
						id: 'test',
						_npm_package_name: 'original',
					},
				},
				{
					id: 'test',
					_npm_package_name: 'cantdothat',
				},
				false,
			],
		];

		for (const t of testCases) {
			const [existingManifests, manifest, shouldWork] = t;

			let hasThrown = false;
			try {
				checkIfPluginCanBeAdded(existingManifests as unknown as Parameters<typeof checkIfPluginCanBeAdded>[0], manifest as unknown as Parameters<typeof checkIfPluginCanBeAdded>[1], { source: 'npm' });
			} catch (error) {
				hasThrown = true;
			}

			expect(!hasThrown).toBe(shouldWork);
		}
	});

	test('should not add if already a plugin with this ID but a different case', () => {
		const testCases = [
			[
				{
					'test': {
						id: 'test',
						_npm_package_name: 'original',
					},
				},
				{
					id: 'newone',
					_npm_package_name: 'otherpackage',
				},
				true,
			],
			[
				{
					'test': {
						id: 'test',
						_npm_package_name: 'original',
					},
				},
				{
					id: 'Test',
					_npm_package_name: 'original',
				},
				false,
			],
		];

		for (const t of testCases) {
			const [existingManifests, manifest, shouldWork] = t;

			let hasThrown = false;
			try {
				checkIfPluginCanBeAdded(existingManifests as unknown as Parameters<typeof checkIfPluginCanBeAdded>[0], manifest as unknown as Parameters<typeof checkIfPluginCanBeAdded>[1], { source: 'npm' });
			} catch (error) {
				hasThrown = true;
			}

			expect(!hasThrown).toBe(shouldWork);
		}
	});

	test('should not add if already a plugin with this ID but different repository url', () => {
		const testCases = [
			[
				{
					'test': {
						id: 'test',
						repository_url: 'https://github.com/laurent22/joplin',
					},
				},
				{
					id: 'test',
					repository_url: 'https://github.com/laurent22/joplin.git',
				},
				true,
			],
			[
				{
					'test': {
						id: 'test',
						repository_url: 'https://github.com/laurent22/joplin',
					},
				},
				{
					id: 'test',
					repository_url: 'https://github.com/someone/else',
				},
				false,
			],
		];

		for (const t of testCases) {
			const [existingManifests, manifest, shouldWork] = t;

			let hasThrown = false;
			try {
				checkIfPluginCanBeAdded(existingManifests as unknown as Parameters<typeof checkIfPluginCanBeAdded>[0], manifest as unknown as Parameters<typeof checkIfPluginCanBeAdded>[1], { source: 'repository' });
			} catch (error) {
				hasThrown = true;
			}

			expect(!hasThrown).toBe(shouldWork);
		}
	});

	test('should reject moving a legacy npm plugin to an unverified repository', () => {
		const existingManifests = {
			'test': {
				id: 'test',
				_npm_package_name: 'original',
			},
		};
		const manifest = {
			id: 'test',
			repository_url: 'https://github.com/attacker/plugin',
		};

		expect(
			() => checkIfPluginCanBeAdded(
				existingManifests as unknown as Parameters<typeof checkIfPluginCanBeAdded>[0],
				manifest as unknown as Parameters<typeof checkIfPluginCanBeAdded>[1],
				{ source: 'repository' },
			),
		).toThrow('A maintainer must verify and register its repository URL');
	});

	test('should reject a legacy repository migration even if the npm package name is copied', () => {
		const existingManifests = {
			'test': {
				id: 'test',
				_npm_package_name: 'original',
			},
		};
		const manifest = {
			id: 'test',
			repository_url: 'https://github.com/attacker/plugin',
			_npm_package_name: 'original',
		};

		expect(
			() => checkIfPluginCanBeAdded(
				existingManifests as unknown as Parameters<typeof checkIfPluginCanBeAdded>[0],
				manifest as unknown as Parameters<typeof checkIfPluginCanBeAdded>[1],
				{ source: 'repository' },
			),
		).toThrow('A maintainer must verify and register its repository URL');
	});

	test('should not fall back to an npm package name after repository ownership is registered', () => {
		const existingManifests = {
			'test': {
				id: 'test',
				repository_url: 'https://github.com/original/plugin',
				_npm_package_name: 'original',
			},
		};
		const manifest = {
			id: 'test',
			_npm_package_name: 'original',
		};

		expect(
			() => checkIfPluginCanBeAdded(
				existingManifests as unknown as Parameters<typeof checkIfPluginCanBeAdded>[0],
				manifest as unknown as Parameters<typeof checkIfPluginCanBeAdded>[1],
				{ source: 'npm' },
			),
		).toThrow('has already been published under repository');
	});

});

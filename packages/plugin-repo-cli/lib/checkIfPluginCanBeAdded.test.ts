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
				checkIfPluginCanBeAdded(existingManifests, manifest);
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
				checkIfPluginCanBeAdded(existingManifests, manifest);
			} catch (error) {
				hasThrown = true;
			}

			expect(!hasThrown).toBe(shouldWork);
		}
	});

});

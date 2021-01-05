const { packageNameFromPluginName } = require('./utils');

describe('utils', () => {

	test('packageNameFromPluginName', () => {
		const testCases = [
			['That\'s my plugin!', 'joplin-plugin-that-s-my-plugin'],
			['with-dashes', 'joplin-plugin-with-dashes'],
			['with.dots...', 'joplin-plugin-with-dots'],
			['¡¡¡front dashes!!!', 'joplin-plugin-front-dashes'],
			['That [will] [be] removed', 'joplin-plugin-that-will-be-removed'],
			['very very very long name very very very long name very very very long name very very very long name very very very long name very very very long name very very very long name very very very long name very very very long name', 'joplin-plugin-very-very-very-long-name-very-very-very-long-name-very-very-very-long-name-very-very-very-long-name-very-very-very-long-name-very-very-very-long-name-very-very-very-long-name-very-very-very-long-name'],
		];

		for (const t of testCases) {
			const input = t[0];
			const expected = t[1];
			const actual = packageNameFromPluginName(input);
			expect(actual).toBe(expected);
		}

		let hasThrown = false;
		try {
			packageNameFromPluginName('');
		} catch (error) {
			hasThrown = true;
		}

		expect(hasThrown).toBe(true);
	});

});

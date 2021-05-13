const { packageNameFromPluginName, mergeIgnoreFile } = require('./utils');

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

	test('mergeIgnoreFile', () => {
		const testCases = [
			['line1\nline2\n', 'newline\n', 'line1\nline2\nnewline\n'],
			['line1\nline2\n', 'line1\nnewline\n', 'line1\nline2\nnewline\n'],
			['line1\r\nline2\r\n', 'line1\nnewline\n', 'line1\nline2\nnewline\n'],
			['line1\nline2\n', 'line1\r\nnewline\r\n', 'line1\nline2\nnewline\n'],
			['line1\r\nline2\r\n', 'line1\r\nnewline\r\n', 'line1\nline2\nnewline\n'],
		];

		for (const t of testCases) {
			const userVersion = t[0];
			const frameworkVersion = t[1];
			const expected = t[2];
			const actual = mergeIgnoreFile(frameworkVersion, userVersion);
			expect(actual).toBe(expected);
		}
	});

});

import validatePluginId from './validatePluginId';

describe('validatePluginId', () => {

	test('should validate an ID', () => {
		const okCases = [
			'joplinapp.org.plugins.thatsok',
			'joplinapp.org.plugins.that-s-ok',
			'joplinapp.org.plugins.that_s_fine12',
			'joplinapp.org.plugins.com.ok.too',
			'joplinapp.org.plugins.Good',
			'outline',
		];

		const errorCases = [
			'',
			'verylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongid',
			'-shouldstartwiththis',
			'shouldntendwithit.',
			' no space no space no space no space ',
			'no spaceno spaceno spaceno spaceno space',
			'tooshort',
		];

		for (const t of okCases) {
			expect(() => validatePluginId(t)).not.toThrow();
		}

		for (const t of errorCases) {
			expect(() => validatePluginId(t)).toThrow();
		}
	});

});

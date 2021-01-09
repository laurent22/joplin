import validatePluginId from './validatePluginId';

describe('validatePluginId', () => {

	test('should validate an ID', () => {
		const okCases = [
			'thatsok',
			'that-s-ok',
			'that_s_fine12',
			'com.ok.too',
			'Good',
		];

		const errorCases = [
			'',
			'verylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongidverylongid',
			'-shouldstartwiththis',
			'shouldntendwithit.',
			' no space ',
			'no space',
		];

		for (const t of okCases) {
			expect(() => validatePluginId(t)).not.toThrow();
		}

		for (const t of errorCases) {
			expect(() => validatePluginId(t)).toThrow();
		}
	});

});

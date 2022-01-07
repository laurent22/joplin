import validatePluginVersion from './validatePluginVersion';

describe('validatePluginVersion', () => {

	test('should validate a version number', () => {
		const okCases = [
			'1.2.3',
			'3',
			'1.3-beta',
			'10-re',
			'4-ALPHA',
		];

		const errorCases = [
			'',
			'3.14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196442881097566593344612847564823378678316527120190914564856692346034861045432664821339360726024914127372458700660631558817',
			'0.14.1 OHNO',
			'-',
			'-1.5',
			'1.6-',
		];

		for (const t of okCases) {
			expect(() => validatePluginVersion(t)).not.toThrow();
		}

		for (const t of errorCases) {
			expect(() => validatePluginVersion(t)).toThrow();
		}
	});

});

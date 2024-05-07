import WhenClause from './WhenClause';

describe('WhenClause', () => {

	test('should work with simple condition', async () => {
		const wc = new WhenClause('test1 && test2');

		expect(wc.evaluate({
			test1: true,
			test2: true,
		})).toBe(true);

		expect(wc.evaluate({
			test1: true,
			test2: false,
		})).toBe(false);
	});

	test('should work with parentheses', async () => {
		const wc = new WhenClause('(test1 && test2) || test3 && (test4 && !test5)');

		expect(wc.evaluate({
			test1: true,
			test2: true,
			test3: true,
			test4: true,
			test5: true,
		})).toBe(true);

		expect(wc.evaluate({
			test1: false,
			test2: true,
			test3: false,
			test4: false,
			test5: true,
		})).toBe(false);
	});

});

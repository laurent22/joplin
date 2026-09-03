const { diff3MergeRegions } = require('node-diff3');
import boundedDiff3MergeRegions from './boundedDiff3';

// The region combining is taken from node-diff3, so the two must agree on any input the
// bounded diff can complete
const matchesNodeDiff3 = (a: string[], o: string[], b: string[]) => {
	expect(boundedDiff3MergeRegions(a, o, b)).toEqual(diff3MergeRegions(a, o, b));
};

describe('boundedDiff3MergeRegions', () => {

	test('should match node-diff3 for every small input', () => {
		for (let length = 1; length <= 5; length++) {
			for (let bits = 0; bits < Math.pow(2, length); bits++) {
				const base = Array.from({ length }, (_, i) => (bits >> i) & 1 ? 'a' : 'b');

				const variants: string[][] = [base];
				for (let at = 0; at <= length; at++) variants.push([...base.slice(0, at), 'Z', ...base.slice(at)]);
				for (let at = 0; at < length; at++) variants.push(base.map((line, i) => i === at ? 'Z' : line));
				for (let at = 0; at < length; at++) variants.push(base.filter((_, i) => i !== at));

				for (const local of variants) {
					for (const remote of variants) matchesNodeDiff3(local, base, remote);
				}
			}
		}
	});

	test('should give up rather than diff two entirely different notes', () => {
		const base = Array.from({ length: 20000 }, (_, i) => `Line ${i}`);
		const local = Array.from({ length: 20000 }, (_, i) => `Local ${i}`);
		const remote = Array.from({ length: 20000 }, (_, i) => `Remote ${i}`);
		expect(boundedDiff3MergeRegions(local, base, remote)).toBeNull();
	});

	test('should merge a large note of repeated lines quickly', () => {
		const base = Array.from({ length: 20000 }, (_, i) => i % 2 === 0 ? `Text ${i}` : '');
		const local = [...base]; local[0] = 'Text 0 local';
		const remote = [...base]; remote[base.length - 2] = 'Text 19998 remote';

		const startTime = Date.now();
		const regions = boundedDiff3MergeRegions(local, base, remote);
		expect(Date.now() - startTime).toBeLessThan(1000);
		expect(regions).not.toBeNull();
	});

});

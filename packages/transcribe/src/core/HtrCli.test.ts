import { readFile } from 'fs-extra';
import HtrCli from './HtrCli';

describe('HtrCli', () => {
	const dt = new HtrCli('', '');
	it('should parse multiline result', async () => {
		const testCase = await readFile('./test-cases/1.txt');
		const result = dt.cleanUpResult(testCase.toString());
		expect(result).toMatchSnapshot();
	});
	it('should parse singleline result', async () => {
		const testCase = await readFile('./test-cases/2.txt');
		const result = dt.cleanUpResult(testCase.toString());
		expect(result).toMatchSnapshot();
	});
	it('should parse multiline result 2', async () => {
		const testCase = await readFile('./test-cases/3.txt');
		const result = dt.cleanUpResult(testCase.toString());
		expect(result).toMatchSnapshot();
	});
	it('should parse empty result', async () => {
		const testCase = await readFile('./test-cases/4.txt');
		const result = dt.cleanUpResult(testCase.toString());
		expect(result).toMatchSnapshot();
	});
	it('should parse empty result 2', async () => {
		const testCase = await readFile('./test-cases/5.txt');
		const result = dt.cleanUpResult(testCase.toString());
		expect(result).toMatchSnapshot();
	});
	it('should parse empty result 3', async () => {
		const testCase = await readFile('./test-cases/6.txt');
		const result = dt.cleanUpResult(testCase.toString());
		expect(result).toMatchSnapshot();
	});
});

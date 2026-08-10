import { readFile } from 'fs-extra';
import HtrCli from './HtrCli';

describe('HtrCli', () => {
	const dt = new HtrCli({ htrCliImagesFolder: '', binaryPath: '', modelsFolder: '', gpuLayers: 0 });
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

	it('should not pass -ngl when gpuLayers is 0 (CPU only)', () => {
		const cpuCli = new HtrCli({ htrCliImagesFolder: '/img', binaryPath: '/bin/llama', modelsFolder: '/models', gpuLayers: 0 });
		const command = cpuCli.buildCommand('sample.jpg');
		expect(command).not.toContain('-ngl');
	});

	it('should pass -ngl N when gpuLayers > 0 (GPU offload)', () => {
		const gpuCli = new HtrCli({ htrCliImagesFolder: '/img', binaryPath: '/bin/llama', modelsFolder: '/models', gpuLayers: 9999 });
		const command = gpuCli.buildCommand('sample.jpg');
		const nglIndex = command.indexOf('-ngl');
		expect(nglIndex).toBeGreaterThanOrEqual(0);
		expect(command[nglIndex + 1]).toBe('9999');
	});
});

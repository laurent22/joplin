import { readFile } from 'fs-extra';
import HtrCli from './HtrCli';

jest.mock('@joplin/utils', () => {
	const actual = jest.requireActual('@joplin/utils') as object;
	return {
		...actual,
		execCommand: jest.fn(),
	};
});

const { execCommand } = require('@joplin/utils');

const fakeExecOutput = 'image decoded\n\nllama_perf_context_print:';

describe('HtrCli', () => {
	const dt = new HtrCli({ htrCliImagesFolder: '', binaryPath: '', modelsFolder: '' });
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

	const baseOpts = {
		htrCliImagesFolder: '/img',
		binaryPath: '/bin/llama-mtmd-cli',
		modelsFolder: '/models',
	};

	beforeEach(() => {
		(execCommand as jest.Mock).mockResolvedValue(fakeExecOutput);
	});

	it('gPU CLI flag - should NOT add -ngl when gpuLayers is 0 or undefined', async () => {
		// undefined (omit gpuLayers)
		const cliUndefined = new HtrCli({ ...baseOpts });
		await cliUndefined.run('test.png');
		let command = (execCommand as jest.Mock).mock.calls[0][0] as string[];
		expect(command).not.toContain('-ngl');

		// explicit 0
		(execCommand as jest.Mock).mockClear();
		const cliZero = new HtrCli({ ...baseOpts, gpuLayers: 0 });
		await cliZero.run('test.png');
		command = (execCommand as jest.Mock).mock.calls[0][0] as string[];
		expect(command).not.toContain('-ngl');
	});

	it('gPU CLI flag - should add -ngl <value> when gpuLayers is greater than 0', async () => {
		const cliGpu = new HtrCli({ ...baseOpts, gpuLayers: 999 });
		await cliGpu.run('test.png');
		const command = (execCommand as jest.Mock).mock.calls[0][0] as string[];
		const nglIndex = command.indexOf('-ngl');
		expect(nglIndex).toBeGreaterThanOrEqual(0);
		expect(command[nglIndex + 1]).toBe('999');
	});
});

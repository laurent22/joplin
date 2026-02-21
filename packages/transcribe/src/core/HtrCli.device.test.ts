import HtrCli from './HtrCli';
import * as utils from '@joplin/utils';

jest.mock('@joplin/utils', () => ({
    ...jest.requireActual('@joplin/utils'),
    execCommand: jest.fn(),
}));

describe('HtrCli device detection and fallback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should not call nvidia-smi and should omit -ngl when device is cpu', async () => {
        const execCommandSpy = jest.spyOn(utils, 'execCommand').mockResolvedValue('```dummy```');

        const cli = new HtrCli({ htrCliImagesFolder: '/tmp', binaryPath: '/bin/cmd', modelsFolder: '/models', device: 'cpu' });
        await cli.init();

        expect(execCommandSpy).not.toHaveBeenCalledWith(['nvidia-smi'], expect.anything());

        await cli.run('test.png');

        expect(execCommandSpy).toHaveBeenCalledTimes(1);
        const commandArgs = execCommandSpy.mock.calls[0][0] as string[];
        expect(commandArgs).not.toContain('-ngl');
    });

    it('should skip detection and use GPU immediately when device is gpu', async () => {
        const execCommandSpy = jest.spyOn(utils, 'execCommand').mockResolvedValue('```dummy```');

        const cli = new HtrCli({ htrCliImagesFolder: '/tmp', binaryPath: '/bin/cmd', modelsFolder: '/models', device: 'gpu' });
        await cli.init();

        expect(execCommandSpy).not.toHaveBeenCalledWith(['nvidia-smi'], expect.anything());

        await cli.run('test.png');

        expect(execCommandSpy).toHaveBeenCalledTimes(1);
        const commandArgs = execCommandSpy.mock.calls[0][0] as string[];
        expect(commandArgs).toContain('-ngl');
        expect(commandArgs).toContain('9999');
    });

    it('should use GPU when device is auto and nvidia-smi succeeds', async () => {
        const execCommandSpy = jest.spyOn(utils, 'execCommand')
            .mockResolvedValueOnce('') // nvidia-smi succeeds
            .mockResolvedValueOnce('```dummy```'); // transcription succeeds

        const cli = new HtrCli({ htrCliImagesFolder: '/tmp', binaryPath: '/bin/cmd', modelsFolder: '/models', device: 'auto' });
        await cli.init();

        expect(execCommandSpy).toHaveBeenCalledWith(['nvidia-smi'], expect.anything());

        await cli.run('test.png');

        expect(execCommandSpy).toHaveBeenCalledTimes(2);
        const commandArgs = execCommandSpy.mock.calls[1][0] as string[];
        expect(commandArgs).toContain('-ngl');
    });

    it('should fallback to CPU when device is auto but nvidia-smi fails', async () => {
        const execCommandSpy = jest.spyOn(utils, 'execCommand')
            .mockRejectedValueOnce(new Error('Command failed: nvidia-smi')) // nvidia-smi fails
            .mockResolvedValueOnce('```dummy```'); // transcription succeeds on cpu

        const cli = new HtrCli({ htrCliImagesFolder: '/tmp', binaryPath: '/bin/cmd', modelsFolder: '/models', device: 'auto' });
        await cli.init();

        expect(execCommandSpy).toHaveBeenCalledWith(['nvidia-smi'], expect.anything());

        await cli.run('test.png');

        expect(execCommandSpy).toHaveBeenCalledTimes(2);
        const commandArgs = execCommandSpy.mock.calls[1][0] as string[];
        expect(commandArgs).not.toContain('-ngl');
    });

    it('should fallback to CPU if transcription throws a CUDA error on GPU', async () => {
        const execCommandSpy = jest.spyOn(utils, 'execCommand')
            .mockRejectedValueOnce(new Error('CUDA error: out of memory')) // First attempt fails with CUDA error
            .mockResolvedValueOnce('```dummy```'); // Fallback CPU attempt succeeds

        const cli = new HtrCli({ htrCliImagesFolder: '/tmp', binaryPath: '/bin/cmd', modelsFolder: '/models', device: 'gpu' });
        await cli.init(); // useGpu = true

        await cli.run('test.png');

        expect(execCommandSpy).toHaveBeenCalledTimes(2);

        const firstAttemptArgs = execCommandSpy.mock.calls[0][0] as string[];
        expect(firstAttemptArgs).toContain('-ngl'); // Tried GPU first

        const secondAttemptArgs = execCommandSpy.mock.calls[1][0] as string[];
        expect(secondAttemptArgs).not.toContain('-ngl'); // Fell back to CPU
    });

    it('should not retry and rethrow if transcription throws a generic error', async () => {
        const genericError = new Error('File not found');
        const execCommandSpy = jest.spyOn(utils, 'execCommand')
            .mockRejectedValueOnce(genericError);

        const cli = new HtrCli({ htrCliImagesFolder: '/tmp', binaryPath: '/bin/cmd', modelsFolder: '/models', device: 'gpu' });
        await cli.init(); // useGpu = true

        await expect(cli.run('test.png')).rejects.toThrow('File not found');

        expect(execCommandSpy).toHaveBeenCalledTimes(1); // Only tried once
    });
});

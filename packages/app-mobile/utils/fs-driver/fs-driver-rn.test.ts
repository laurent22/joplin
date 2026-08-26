const mockSaf = {
	copyFile: jest.fn(),
	copyFileToDirectory: jest.fn(),
	listFiles: jest.fn(),
	stat: jest.fn(),
	writeFile: jest.fn(),
	writeFileInDirectory: jest.fn(),
};

jest.mock('rn-fetch-blob', () => ({
	__esModule: true,
	default: { fs: {} },
}));

jest.mock('@joplin/react-native-saf-x', () => ({
	__esModule: true,
	default: mockSaf,
	openDocumentTree: jest.fn(),
}));

import FsDriverRN from './fs-driver-rn';

describe('FsDriverRN SAF destination lookup', () => {
	const parentPath = 'content://provider/tree/root';
	const destinationPath = `${parentPath}/existing.md`;
	const destinationUri = 'content://provider/document/existing';

	beforeEach(() => {
		jest.clearAllMocks();
		mockSaf.stat.mockResolvedValue({ uri: parentPath, documentUri: parentPath });
		mockSaf.listFiles.mockResolvedValue([{
			name: 'existing.md',
			uri: destinationPath,
			documentUri: destinationUri,
		}]);
		mockSaf.writeFile.mockResolvedValue(undefined);
		mockSaf.copyFile.mockResolvedValue(undefined);
		mockSaf.writeFileInDirectory.mockResolvedValue({ uri: `${parentPath}/new.md` });
		mockSaf.copyFileToDirectory.mockResolvedValue({ uri: `${parentPath}/new.md` });
	});

	it('should overwrite an existing file discovered while warming an empty cache', async () => {
		const driver = new FsDriverRN();

		await driver.writeFile(destinationPath, 'updated', 'utf8');
		await driver.writeFile(destinationPath, 'updated again', 'utf8');

		expect(mockSaf.listFiles).toHaveBeenCalledTimes(1);
		expect(mockSaf.writeFile).toHaveBeenNthCalledWith(1, destinationUri, 'updated', { encoding: 'utf8' });
		expect(mockSaf.writeFile).toHaveBeenNthCalledWith(2, destinationUri, 'updated again', { encoding: 'utf8' });
		expect(mockSaf.writeFileInDirectory).not.toHaveBeenCalled();
	});

	it('should overwrite an existing copy destination discovered while warming an empty cache', async () => {
		const driver = new FsDriverRN();
		const sourcePath = '/local/source.md';

		await driver.copy(sourcePath, destinationPath);

		expect(mockSaf.listFiles).toHaveBeenCalledWith(parentPath);
		expect(mockSaf.copyFile).toHaveBeenCalledWith(sourcePath, destinationUri, { replaceIfDestinationExists: true });
		expect(mockSaf.copyFileToDirectory).not.toHaveBeenCalled();
	});

	it('should overwrite a destination discovered by stat after an older listing', async () => {
		const driver = new FsDriverRN();
		mockSaf.listFiles.mockResolvedValueOnce([]);
		await driver.readDirStats(parentPath);
		mockSaf.stat.mockResolvedValueOnce({
			name: 'existing.md',
			uri: destinationPath,
			documentUri: destinationUri,
			type: 'file',
			size: 0,
			lastModified: 0,
		});

		await driver.stat(destinationPath);
		await driver.writeFile(destinationPath, 'updated', 'utf8');

		expect(mockSaf.listFiles).toHaveBeenCalledTimes(1);
		expect(mockSaf.writeFile).toHaveBeenCalledWith(destinationUri, 'updated', { encoding: 'utf8' });
		expect(mockSaf.writeFileInDirectory).not.toHaveBeenCalled();
	});

	it('should explicitly enable replacement for directory-based writes and copies', async () => {
		const driver = new FsDriverRN();
		mockSaf.listFiles.mockResolvedValue([]);

		await driver.writeFile(`${parentPath}/new.md`, 'new', 'utf8');
		await driver.copy('/local/source.md', `${parentPath}/copied.md`);

		expect(mockSaf.writeFileInDirectory).toHaveBeenCalledWith(
			parentPath, 'new.md', 'new', { encoding: 'utf8', replaceIfDestinationExists: true },
		);
		expect(mockSaf.copyFileToDirectory).toHaveBeenCalledWith(
			'/local/source.md', parentPath, 'copied.md', { replaceIfDestinationExists: true },
		);
	});

	it('should refresh a cached destination after a non-ENOENT write failure without replaying it', async () => {
		const driver = new FsDriverRN();
		await driver.writeFile(destinationPath, 'first', 'utf8');
		mockSaf.writeFile.mockRejectedValueOnce(Object.assign(new Error('Provider failure'), { code: 'EIO' }));

		await expect(driver.writeFile(destinationPath, 'failed', 'utf8')).rejects.toThrow('Provider failure');
		expect(mockSaf.writeFile).toHaveBeenCalledTimes(2);

		await driver.writeFile(destinationPath, 'retried', 'utf8');
		expect(mockSaf.listFiles).toHaveBeenCalledTimes(2);
		expect(mockSaf.writeFile).toHaveBeenLastCalledWith(destinationUri, 'retried', { encoding: 'utf8' });
	});

	it('should reject a directory entry whose URI is not relative to the listed directory', async () => {
		const driver = new FsDriverRN();
		mockSaf.listFiles.mockResolvedValueOnce([{
			name: 'existing.md',
			uri: destinationUri,
			documentUri: destinationUri,
		}]);

		await expect(driver.readDirStats(parentPath)).rejects.toThrow('Document URI does not start with directory path');
		await driver.writeFile(destinationPath, 'updated', 'utf8');

		// The invalid listing must not be treated as complete or populate the
		// document cache. A subsequent operation obtains a fresh listing.
		expect(mockSaf.listFiles).toHaveBeenCalledTimes(2);
		expect(mockSaf.writeFile).toHaveBeenCalledWith(destinationUri, 'updated', { encoding: 'utf8' });
	});
});

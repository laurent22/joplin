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
});

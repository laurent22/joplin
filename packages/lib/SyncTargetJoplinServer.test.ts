import { newFileApi, SyncTargetJoplinServer, FileApiOptions } from '../SyncTargetJoplinServer';
import JoplinServerApi from '../JoplinServerApi';
import * as urlUtils from '../urlUtils';

// Mock the JoplinServerApi module
jest.mock('../JoplinServerApi');

describe('SyncTargetJoplinServer', () => {

	describe('newFileApi', () => {
		it('should trim leading and trailing spaces from the base URL', async () => {
			const mockOptions: FileApiOptions = {
				path: () => '   https://example.com   ',
				userContentPath: () => '   https://usercontent.example.com   ',
				username: () => 'user',
				password: () => 'pass',
				apiKey: () => '',
			};

			await newFileApi(9, mockOptions);

			expect(JoplinServerApi).toHaveBeenCalledTimes(1);
			const calledApiOptions = (JoplinServerApi as jest.Mock).mock.calls[0][0];
			expect(calledApiOptions.baseUrl()).toBe('https://example.com');
			expect(calledApiOptions.userContentBaseUrl()).toBe('https://usercontent.example.com');
		});

		it('should handle empty or whitespace‑only strings', async () => {
			const mockOptions: FileApiOptions = {
				path: () => '   ',
				userContentPath: () => '   ',
				username: () => 'user',
				password: () => 'pass',
				apiKey: () => '',
			};

			await newFileApi(9, mockOptions);

			expect(JoplinServerApi).toHaveBeenCalledTimes(1);
			const calledApiOptions = (JoplinServerApi as jest.Mock).mock.calls[0][0];
			expect(calledApiOptions.baseUrl()).toBe('');
			expect(calledApiOptions.userContentBaseUrl()).toBe('');
		});
	});

	describe('checkConfig', () => {
		it('should trim URL before protocol validation', async () => {
			// Spy on validateUrlProtocol to verify it receives the trimmed string
			const validateSpy = jest.spyOn(urlUtils, 'validateUrlProtocol');
			validateSpy.mockReturnValue(''); // assume validation passes

			const mockOptions: FileApiOptions = {
				path: () => '   https://example.com   ',
				userContentPath: () => '',
				username: () => '',
				password: () => '',
				apiKey: () => '',
			};

			// We need to mock the fileApi calls that happen inside checkConfig.
			// Since checkConfig creates a new fileApi using newFileApi, and we already
			// mocked JoplinServerApi, we also need to mock the fileApi methods (put, get, delete).
			// But to keep the test simple, we can partially mock the fileApi returned by newFileApi.
			// However, that's more complex. Instead, we can provide a mock fileApi directly
			// to checkConfig via the optional parameter.
			const mockFileApi = {
				requestRepeatCount_: 0,
				get: jest.fn().mockRejectedValue(new Error('Not found')), // simulate no info.json
				put: jest.fn().mockResolvedValue(undefined),
				delete: jest.fn().mockResolvedValue(undefined),
			};

			// Call checkConfig with the mock fileApi
			const result = await SyncTargetJoplinServer.checkConfig(mockOptions, null, mockFileApi as any);

			// Verify that validateUrlProtocol was called with the trimmed URL
			expect(validateSpy).toHaveBeenCalledWith('https://example.com');
			// Since we mocked fileApi.put to succeed, the check should return ok: true
			expect(result.ok).toBe(true);

			validateSpy.mockRestore();
		});
	});
});

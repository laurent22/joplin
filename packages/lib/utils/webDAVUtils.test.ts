import checkProviderIsSupported from './webDAVUtils';
import Setting from '../models/Setting';

describe('checkProviderIsSupported', () => {
	describe('when no unsupported provider is already configured', () => {
		beforeAll(() => {
			Setting.setValue('sync.allowUnsupportedProviders', 0);
		});

		it('should not throw when no provider path is provided ', () => {
			expect(() => checkProviderIsSupported('')).not.toThrow();
		});

		it('should not throw when a valid provider path is provided', () => {
			expect(() => checkProviderIsSupported('https://good-webdav-provider.com')).not.toThrow();
		});

		it('should not throw when a valid provider path with a name that contains an unsupported provider is provided', () => {
			expect(() => checkProviderIsSupported('https://hopcloudabc.com')).not.toThrow();
		});

		it('should throw an error with the name of the provider when an unsupported provider path is provided', () => {
			expect(() => checkProviderIsSupported('https://pcloud.com')).toThrowError('The WebDAV implementation of pcloud is incompatible with Joplin, and as such is no longer supported. Please use a different sync method.');

			expect(() => checkProviderIsSupported('https://api.pcloud.com')).toThrowError('The WebDAV implementation of pcloud is incompatible with Joplin, and as such is no longer supported. Please use a different sync method.');

			// expect(() => checkProviderIsSupported('https://api-pcloud-test.com')).toThrowError('The WebDAV implementation of pcloud is incompatible with Joplin, and as such is no longer supported. Please use a different sync method.');
		});
		// expect(() => checkProviderIsSupported('?param=pcloud')).toThrowError('The WebDAV implementation of pcloud is incompatible with Joplin, and as such is no longer supported. Please use a different sync method.');
	});

	describe('when an unsupported provider is already configured', () => {
		beforeAll(() => {
			Setting.setValue('sync.allowUnsupportedProviders', 1);
		});

		it('should not throw when an unsupported provider is already configured', () => {
			expect(() => checkProviderIsSupported('pcloud')).not.toThrow();
		});

	});
});


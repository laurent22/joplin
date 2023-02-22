import checkProviderIsUnsupported from './webDAVUtils';
import Setting from '../models/Setting';

describe('checkProviderIsUnsupported', () => {
	describe('when no unsupported provider is already configured', () => {
		beforeAll(() => {
			Setting.setValue('sync.allowUnsupportedProviders', 0);
		});

		it('should return false when no provider path is provided ', () => {
			const result = checkProviderIsUnsupported('');
			expect(result.isUnsupported).toBe(false);
			expect(result.unsupportedProvider).toBe('');
		});

		it('should return false when a valid provider path is provided', () => {
			const result = checkProviderIsUnsupported('https://good-webdav-provider.com');
			expect(result.isUnsupported).toBe(false);
			expect(result.unsupportedProvider).toBe('');
		});

		it('should return false when a valid provider path with a similar name is provided', () => {
			const result = checkProviderIsUnsupported('https://hopcloudabc.com');
			expect(result.isUnsupported).toBe(false);
			expect(result.unsupportedProvider).toBe('');
		});

		it('should return true and the name of the provider when an unsupported provider path is provided', () => {
			const first = checkProviderIsUnsupported('https://pcloud.com');
			const second = checkProviderIsUnsupported('https://api.pcloud.com');
			const third = checkProviderIsUnsupported('https://api-pcloud-test.com');

			expect(first.isUnsupported).toBe(true);
			expect(first.unsupportedProvider).toBe('pcloud');

			expect(second.isUnsupported).toBe(true);
			expect(second.unsupportedProvider).toBe('pcloud');

			expect(third.isUnsupported).toBe(true);
			expect(third.unsupportedProvider).toBe('pcloud');
		});
	});

	describe('when an unsupported provider is already configured', () => {
		beforeAll(() => {
			Setting.setValue('sync.allowUnsupportedProviders', 1);
		});

		it('should return false when an unsupported provider is already configured', () => {
			const result = checkProviderIsUnsupported('pcloud');
			expect(result.isUnsupported).toBe(false);
			expect(result.unsupportedProvider).toBe('');
		});

	});
});


import checkProviderIsUnsupported from './webDAVUtils';
import Setting from '../models/Setting';

describe('checkProviderIsUnsupported', function() {
	describe('when no blocked provider is already configured', function() {
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

		it('should return true and the name of the provider when a blocked provider path is provided', () => {
			const result = checkProviderIsUnsupported('https://pcloud.com');
			expect(result.isUnsupported).toBe(true);
			expect(result.unsupportedProvider).toBe('pcloud');
		});
	});

	describe('when a blocked provider is already configured', function() {
		beforeAll(() => {
			Setting.setValue('sync.allowUnsupportedProviders', 1);
		});

		it('should return true when a blocked provider is already configured', () => {
			const result = checkProviderIsUnsupported('pcloud');
			expect(result.isUnsupported).toBe(false);
			expect(result.unsupportedProvider).toBe('');
		});

	});
});


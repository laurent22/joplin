import { decodeFilePath, decodeFileUri } from './pathDecoding';

describe('pathDecoding', () => {
	describe('decodeFilePath', () => {
		it('should decode URL-encoded hash character', () => {
			const encoded = 'Order%20Received%20-%20Order%20%23T3666673.pdf';
			const decoded = decodeFilePath(encoded);
			expect(decoded).toBe('Order Received - Order #T3666673.pdf');
		});

		it('should decode multiple special characters', () => {
			const encoded = 'file%20%23%26%3F%25.txt';
			const decoded = decodeFilePath(encoded);
			expect(decoded).toBe('file #&?%.txt');
		});

		it('should handle ampersand', () => {
			const encoded = 'Report%20%26%20Summary.pdf';
			const decoded = decodeFilePath(encoded);
			expect(decoded).toBe('Report & Summary.pdf');
		});

		it('should handle question mark', () => {
			const encoded = 'What%3F.txt';
			const decoded = decodeFilePath(encoded);
			expect(decoded).toBe('What?.txt');
		});

		it('should handle percent sign', () => {
			const encoded = 'Discount%2050%25.pdf';
			const decoded = decodeFilePath(encoded);
			expect(decoded).toBe('Discount 50%.pdf');
		});

		it('should handle empty string', () => {
			const decoded = decodeFilePath('');
			expect(decoded).toBe('');
		});

		it('should handle already decoded paths', () => {
			const path = 'Order Received - Order #T3666673.pdf';
			const decoded = decodeFilePath(path);
			expect(decoded).toBe(path);
		});

		it('should handle invalid UTF-8 encoding gracefully', () => {
			// Invalid percent encoding should return original string
			const encoded = 'test%ZZ.txt';
			const decoded = decodeFilePath(encoded);
			expect(decoded).toBe('test%ZZ.txt');
		});
	});

	describe('decodeFileUri', () => {
		it('should decode file:// URI with encoded hash', () => {
			const uri = 'file:///var/mobile/Order%20%23T3666673.pdf';
			const decoded = decodeFileUri(uri);
			expect(decoded).toBe('file:///var/mobile/Order #T3666673.pdf');
		});

		it('should decode file:// URI with multiple special characters', () => {
			const uri = 'file:///path/to%20file%20%23%26%3F%25.txt';
			const decoded = decodeFileUri(uri);
			expect(decoded).toBe('file:///path/to file #&?%.txt');
		});

		it('should handle regular paths without file:// prefix', () => {
			const path = '/var/mobile/Order%20%23T3666673.pdf';
			const decoded = decodeFileUri(path);
			expect(decoded).toBe('/var/mobile/Order #T3666673.pdf');
		});

		it('should preserve file:// prefix in output', () => {
			const uri = 'file:///test%20path.pdf';
			const decoded = decodeFileUri(uri);
			expect(decoded.startsWith('file://')).toBe(true);
		});

		it('should handle empty string', () => {
			const decoded = decodeFileUri('');
			expect(decoded).toBe('');
		});

		it('should handle URIs with complex paths', () => {
			const uri =
        'file:///private/var/mobile/Containers/Shared%20Data/Order%20%23123%20%26%20Tracking.pdf';
			const decoded = decodeFileUri(uri);
			expect(decoded).toBe(
				'file:///private/var/mobile/Containers/Shared Data/Order #123 & Tracking.pdf',
			);
		});

		it('should handle already decoded URIs', () => {
			const uri = 'file:///var/mobile/Order #T3666673.pdf';
			const decoded = decodeFileUri(uri);
			expect(decoded).toBe(uri);
		});
	});
});

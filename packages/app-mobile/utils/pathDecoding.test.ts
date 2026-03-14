import { decodeFilePath, decodeFileUri } from './pathDecoding';

describe('pathDecoding', () => {
	test.each([
		['Order%20Received%20-%20Order%20%23T3666673.pdf', 'Order Received - Order #T3666673.pdf'],
		['file%20%23%26%3F%25.txt', 'file #&?%.txt'],
		['Report%20%26%20Summary.pdf', 'Report & Summary.pdf'],
		['What%3F.txt', 'What?.txt'],
		['Discount%2050%25.pdf', 'Discount 50%.pdf'],
		['', ''],
		['Order Received - Order #T3666673.pdf', 'Order Received - Order #T3666673.pdf'],
		['test%ZZ.txt', 'test%ZZ.txt'],
	])('decodeFilePath(%s) should return %s', (input, expected) => {
		expect(decodeFilePath(input)).toBe(expected);
	});

	test.each([
		['file:///var/mobile/Order%20%23T3666673.pdf', 'file:///var/mobile/Order #T3666673.pdf'],
		['file:///path/to%20file%20%23%26%3F%25.txt', 'file:///path/to file #&?%.txt'],
		['/var/mobile/Order%20%23T3666673.pdf', '/var/mobile/Order #T3666673.pdf'],
		['file:///test%20path.pdf', 'file:///test path.pdf'],
		['', ''],
		[
			'file:///private/var/mobile/Containers/Shared%20Data/Order%20%23123%20%26%20Tracking.pdf',
			'file:///private/var/mobile/Containers/Shared Data/Order #123 & Tracking.pdf',
		],
		['file:///var/mobile/Order #T3666673.pdf', 'file:///var/mobile/Order #T3666673.pdf'],
	])('decodeFileUri(%s) should return %s', (input, expected) => {
		expect(decodeFileUri(input)).toBe(expected);
	});
});

import useOnMessage from '../components/NoteBodyViewer/hooks/useOnMessage';
import { renderHook } from '@testing-library/react-hooks';

describe('useLayoutItemSizes', () => {

	test('url should not be changed', () => {
		const testCases = ['https://telegra.ph/马斯克开房聊天中外网友在线求码Clubhouse一夜火遍全球-02-07',
			'https://ja.wikipedia.org/wiki/カステラ',
			'https://ru.wikipedia.org/wiki/Кастелла',
			'https://ar.wikipedia.org/wiki/كاستيلا_(حلويات)',
			'http://www14.internal.com/?tdfs=1&uid=1617350093.0040034536&sbox=0&kwl=My%20Account%20Management%20Software|Online%20Payment%20Gateway|Help%20Desk%20Ticket%20System||||||||',
			'http://www.google.jo/#!',
			'http://google.com/search?hl=en&q=\\”hello%20world\\”'];

		for (const url of testCases) {
			const { result } = renderHook(() => useOnMessage(() => {},
				url,
				() => {},
				() => {},
				() => {}));
			expect(result.current({ 'nativeEvent': { 'data': url } }).msg).toBe(url);
		}
	});
});

import Color4 from './Color4';

describe('Color4', () => {
	it('should convert to #RRGGBB-format hex strings (when no alpha)', () => {
		expect(Color4.black.toHexString()).toBe('#000000');
		expect(Color4.fromHex('#f0f').toHexString()).toBe('#f000f0');
	});

	it('should create #RRGGBBAA-format hex strings when there is an alpha component', () => {
		expect(Color4.ofRGBA(1, 1, 1, 0.5).toHexString()).toBe('#ffffff80');
	});
});
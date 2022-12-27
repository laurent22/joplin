import { svgDimensions } from './contextMenuUtils';

describe('contextMenuUtils',()=>{
	test('should return the correct dimensions for svg with space seperated viewBox values',()=>{
		const svg = '<svg viewBox="0 0 45.9375 60" "></svg> ';
		const [width,height] = svgDimensions(svg);
		expect(width).toBe(45);
		expect(height).toBe(60);
	});
	test('should return the correct dimensions for svg with comma seperated viewBox values',()=>{
		const svg = '<svg viewBox="0,0,45.9375,60" "></svg> ';
		const [width,height] = svgDimensions(svg);
		expect(width).toBe(45);
		expect(height).toBe(60);
	});
	test('should return the correct dimensions for svg with comma + space seperated viewBox values',()=>{
		const svg = '<svg viewBox="0, 0, 45.9375, 60" "></svg> ';
		const [width,height] = svgDimensions(svg);
		expect(width).toBe(45);
		expect(height).toBe(60);
	});
	test('should return undefined for svg without viewBox',()=>{
		const svg = '<svg></svg> ';
		const [width,height] = svgDimensions(svg);
		expect(width).toBe(undefined);
		expect(height).toBe(undefined);
	});
	test('should return undefined for svg with NaN width and height',()=>{
		const svg = '<svg viewBox="0 0 troll svg" "></svg> ';
		const [width,height] = svgDimensions(svg);
		expect(width).toBe(undefined);
		expect(height).toBe(undefined);
	});

});

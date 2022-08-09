import Color4 from '../Color4';
import { Vec2 } from '../geometry/Vec2';
import Stroke from './Stroke';

describe('Stroke', () => {
	it('empty stroke should have an empty bounding box', () => {
		const stroke = new Stroke([{
			startPoint: Vec2.zero,
			commands: [],
			style: {
				fill: Color4.blue,
			},
		}]);
		expect(stroke.getBBox()).toMatchObject({
			x: 0, y: 0, w: 0, h: 0,
		});
	});
});

import Color4 from "../Color4";
import { Vec2 } from "../geometry/Vec2";
import Stroke from "./Stroke";

describe('Stroke', () => {
	it('Loading from SVG should update the bounding box', () => {
		const stroke = new Stroke([{
			startPoint: Vec2.zero,
			commands: [],
			fill: {
				color: Color4.blue
			},
		}]);
		expect(stroke.getBBox()).toMatchObject({
			x: 0, y: 0, w: 0, h: 0,
		});

		// Load from an SVG path
		stroke.fromPathString('M 10,10 l 20,10 L 12,12');

		expect(stroke.getBBox()).toMatchObject({
			x: 10, y: 10, w: 20, h: 10,
		});
	});
});
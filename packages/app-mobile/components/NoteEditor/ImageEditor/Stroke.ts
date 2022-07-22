/**
 *
 */

import { Point2, Rect2, Vec2 } from './math';
import AbstractRenderer from './rendering/AbstractRenderer';
import Color4 from './Color4';
import { ImageComponent } from './EditorImage';




class Stroke implements ImageComponent {
	


	/** @return the width of the stroke at a given point. Can be overridden. */
	public getWidthAt(point: StrokeDataPoint, _pointIdx: number): number {
		return point.width;
	}

	public getBoundingBox(): Rect2 {
		return this.bbox;
	}

	public render(ctx: AbstractRenderer, visibleRegion: Rect2, startingIdx: number = 0) {
		for (let i = startingIdx; i < this.points.length - 1; i += 2) {
			let exitingVec;

			const p1 = this.points[i];
			if (i > 0) {
				exitingVec = p1.pos.minus(this.points[i - 1].pos).normalized();
				exitingVec = exitingVec.times(this.points[i + 1].pos.minus(p1.pos).magnitude() * 0.5);
			}


			let p3, p4;
			if (i == this.points.length - 2) {
				p4 = this.points[i + 1];
				if (p4.pos.minus(p1.pos).magnitude() < p1.width) {
					p4 = {
						pos: p1.pos.plus(Vec2.unitX.times(p1.width * 2)),
						color: p4.color,
						width: p4.width,
					};
				}
				p3 = exitingVec ? p1.pos.plus(exitingVec) : p4.pos.lerp(p1.pos, 0.75);
			} else {
				p4 = this.points[i + 2];
				p3 = this.points[i + 1].pos;
			}
			const p2 = exitingVec ? p1.pos.plus(exitingVec) : p3;

			const box = Rect2.bboxOf([p1.pos, p2, p3, p4.pos], Math.max(p1.width, p4.width));
			if (box.intersects(visibleRegion)) {
				if (this.curveCache[i] == null) {
					this.curveCache[i] = ctx.drawStyledCubicBezierCurve(p1, p2, p3, p4);
				} else {
					this.curveCache[i](ctx);
				}
			}
		}
	}
}

export default Stroke;

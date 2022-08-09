import Color4 from '../Color4';
import LineSegment2 from '../geometry/LineSegment2';
import Mat33 from '../geometry/Mat33';
import Rect2 from '../geometry/Rect2';
import AbstractRenderer from '../rendering/AbstractRenderer';
import SVGRenderer from '../rendering/SVGRenderer';
import AbstractComponent from './AbstractComponent';

export default class UnknownSVGObject extends AbstractComponent {
	protected contentBBox: Rect2;

	public constructor(private svgObject: SVGElement) {
		super();
		this.contentBBox = Rect2.of(svgObject.getBoundingClientRect());
	}

	public render(canvas: AbstractRenderer, _visibleRect: Rect2): void {
		if (!(canvas instanceof SVGRenderer)) {
			// Draw a red rectangle to represent this.
			// TODO: Better representation of unrenderable objects.
			canvas.drawRect(this.contentBBox, 5, { fill: Color4.red });

			return;
		}

		canvas.drawSVGElem(this.svgObject);
	}

	public intersects(lineSegment: LineSegment2): boolean {
		return this.contentBBox.getEdges().some(edge => edge.intersection(lineSegment) !== null);
	}

	protected applyTransformation(_affineTransfm: Mat33): void {
	}
}

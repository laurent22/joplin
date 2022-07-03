/**
 * A tree of nodes contained within the editor
 */

import { Rect2 } from './math';

class EditorImage {

}

/**
 * Any component of the EditorImage (e.g. Text, Stroke, etc.)
 */
export interface ImageComponent {
	getBBox(): Rect2;
}

export class ImageNode implements ImageComponent {
	private contentBBox: Rect2;
	private children: ImageComponent[];

	public getChildrenInRegion(region: Rect2): ImageComponent[] {
		return this.children.filter(child => {
			return child.getBBox().intersects(region);
		});
	}

	public getLeavesInRegion(_region: Rect2): ImageComponent[] {
		return []; // TODO
	}

	public getBBox(): Rect2 {
		return this.contentBBox;
	}
}

export default EditorImage;

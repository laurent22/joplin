import ImageEditor from './editor';
import { Point2, Rect2, Vec2 } from './math';
import AbstractRenderer from './rendering/AbstractRenderer';
import Command from "./commands/Command";
import Viewport from './Viewport';

/**
 * A tree of nodes contained within the editor
 */
class EditorImage {
	private root: ImageNode<ImageComponent>;

	public constructor() {
		this.root = new ImageNode<ImageComponent>();
	}

	private addElement(elem: ImageComponent): ImageNode<ImageComponent> {
		return this.root.addLeaf(elem);
	}

	public render(renderer: AbstractRenderer, viewport: Viewport) {
		const minFraction = 0.01;
		const leaves = this.root.getLeavesInRegion(viewport.visibleRect, minFraction);
		for (const leaf of leaves) {
			leaf.render(renderer, viewport.visibleRect);
		}
	}

	public static AddElementCommand = class implements Command {
		private elementContainer: ImageNode<ImageComponent>;
		public constructor(public readonly element: ImageComponent) {
		}

		public apply(editor: ImageEditor) {
			this.elementContainer = editor.image.addElement(this.element);
			editor.queueRerender();
		}

		public unapply(editor: ImageEditor) {
			this.elementContainer?.remove();
			this.elementContainer = null;
			editor.queueRerender();
		}
	};
}

export type AddElementCommand = typeof EditorImage.AddElementCommand.prototype;

/**
 * Any component of the EditorImage (e.g. Text, Stroke, etc.)
 */
export interface ImageComponent {
	getBBox(): Rect2;
	render(canvas: AbstractRenderer, visibleRect: Rect2): void;
}

export class ImageNode<T extends ImageComponent> {
	private content?: T;
	private children: ImageNode<T>[];
	private bbox: Rect2;

	// Estimates of this' relative center of mass and total mass.
	// Used for clustering.
	private centerOfMass: Point2;
	private totalMass: number;

	public constructor(
		private parent?: ImageNode<T>
	) {
		this.children = [];
		this.bbox = Rect2.empty;
		this.totalMass = 0;
		this.centerOfMass = Vec2.zero;
	}

	private getChildrenInRegion(region: Rect2): ImageNode<T>[] {
		return this.children.filter(child => {
			return child.getBBox().intersects(region);
		});
	}

	public getLeavesInRegion(region: Rect2, minFractionOfRegion: number = 0): T[] {
		const result: T[] = [];

		// Don't render if too small
		if (this.bbox.maxDimension / region.maxDimension < minFractionOfRegion) {
			return [];
		}

		if (this.content != null && this.getBBox().intersects(region)) {
			result.push(this.content);
		}

		const children = this.getChildrenInRegion(region);
		for (const child of children) {
			result.push(...child.getLeavesInRegion(region, minFractionOfRegion));
			if (child.content) {
				result.push(child.content);
			}
		}

		return result;
	}

	public addLeaf(leaf: T): ImageNode<T> {
		if (this.content == null && this.children.length === 0) {
			this.content = leaf;
			this.recomputeBBox();

			return this;
		} else {
			const newNode = new ImageNode<T>(this);
			newNode.addLeaf(leaf);
			this.children.push(newNode);
			this.recomputeBBox();

			this.rebalance();
			return newNode;
		}
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	private changeParent(newParent: ImageNode<T>) {
		if (this.parent) {
			this.parent.children = this.parent.children.filter(child => child !== this);
			this.parent.recomputeBBox();
		}
		this.parent = newParent;
		newParent.recomputeBBox();
	}

	/**
	 * Removes outliers from this' children and adds them to the given target
	 */
	private removeOutliers(target: ImageNode<T>) {
		if (this.content != null) {
			return;
		}

		this.children.sort((a, b) => a.bbox.topLeft.x - b.bbox.topLeft.x);

		let leftMax = -Infinity;
		let rightMin = Infinity;
		let leftIdx = 0;
		let rightIdx = this.children.length - 1;
		while (leftMax < rightMin && leftIdx < rightIdx) {
			let left = this.children[leftIdx];
			let right = this.children[rightIdx];
			leftMax = Math.max(left.bbox.bottomRight.x);
			rightMin = Math.min(right.bbox.topLeft.x);

			if (leftMax < rightMin) {
				leftIdx ++;
			} else {
				leftIdx = Math.max(0, leftIdx - 1);
				rightIdx --;
			}
		}

		let children = this.children;
		for (let i = 0; i <= leftIdx; i++) {
			children[i].changeParent(target);
		}
	}

	/** Ensure that this node doesn't have too many or too few children */
	private rebalance() {
		if (this.children.length === 0 && this.content == null) {
			this.remove();
			return;
		}

		// Ensure each node either has content or children (but not both)
		if (this.content != null && this.children.length > 0) {
			const newNode = new ImageNode<T>(this);
			newNode.addLeaf(this.content);
			this.content = null;
			this.children.push(newNode);
		}

		// Can we reduce a child's maximum dimension by pulling children out?
		const maxDimen = this.bbox.maxDimension;
		const maxChildFraction = 0.7;
		if (maxDimen > 0) {
			for (const child of this.children) {
				if (child.getBBox().maxDimension / maxDimen > maxChildFraction && child.content == null) {
					// Can we replace this with the child?
					if (this.children.length === 1) {
						this.children = child.children;
						this.content = child.content;
					} else {
						// Find a good split
						child.removeOutliers(this);
					}
				}
			}
		}

		this.recomputeBBox();
	}

	/** Recomputes this' bounding box and center of mass */
	private recomputeBBox() {
		if (this.content != null) {
			this.bbox = this.content.getBBox();
			this.centerOfMass = this.bbox.center;
			this.totalMass = this.bbox.area;
		} else {
			this.bbox = Rect2.empty;
			let centerOfMass = Vec2.of(0, 0);
			let totalMass = 0;

			for (const child of this.children) {
				this.bbox = this.bbox.union(child.getBBox());
				centerOfMass = centerOfMass.plus(child.centerOfMass.times(child.totalMass));
				totalMass += child.totalMass;
			}
			this.centerOfMass = centerOfMass.times(1/totalMass);
			this.totalMass = totalMass;
		}
	}

	/** Remove this node and all of its children */
	public remove() {
		if (!this.parent) {
			return;
		}

		this.parent.children = this.parent.children.filter(node => {
			return node !== this;
		});
		let node = this.parent;
		while (node != null) {
			node.rebalance();
			node.recomputeBBox();
			node = node.parent;
		}
		this.content = null;
	}
}

export default EditorImage;

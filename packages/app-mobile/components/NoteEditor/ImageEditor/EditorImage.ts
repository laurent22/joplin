import ImageEditor from './editor';
import { Point2, Rect2, Vec2 } from './math';
import AbstractRenderer from './rendering/AbstractRenderer';
import Command from "./commands/Command";
import Viewport from './Viewport';
import AbstractComponent from './components/AbstractComponent';

/**
 * A tree of nodes contained within the editor
 */
class EditorImage {
	private root: ImageNode;

	public constructor() {
		this.root = new ImageNode();
	}

	private addElement(elem: AbstractComponent): ImageNode {
		return this.root.addLeaf(elem);
	}

	/** @returns the parent of the given element, if it exists. */
	public findParent(elem: AbstractComponent): ImageNode|null {
		const candidates = this.root.getLeavesInRegion(elem.getBBox());
		for (const candidate of candidates) {
			if (candidate.getContent() === elem) {
				return candidate;
			}
		}
		return null;
	}

	public render(renderer: AbstractRenderer, viewport: Viewport) {
		const minFraction = 0.01;
		const leaves = this.root.getLeavesInRegion(viewport.visibleRect, minFraction);
		for (const leaf of leaves) {
			leaf.getContent().render(renderer, viewport.visibleRect);
		}
	}

	public static AddElementCommand = class implements Command {
		private elementContainer: ImageNode;
		public constructor(private readonly element: AbstractComponent) {
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


export class ImageNode {
	private content?: AbstractComponent;
	private children: ImageNode[];
	private bbox: Rect2;

	// Estimates of this' relative center of mass and total mass.
	// Used for clustering.
	private centerOfMass: Point2;
	private totalMass: number;

	public constructor(
		private parent?: ImageNode
	) {
		this.children = [];
		this.bbox = Rect2.empty;
		this.totalMass = 0;
		this.centerOfMass = Vec2.zero;
	}

	public getContent(): AbstractComponent|null {
		return this.content;
	}

	private getChildrenInRegion(region: Rect2): ImageNode[] {
		return this.children.filter(child => {
			return child.getBBox().intersects(region);
		});
	}

	/** @returns a list of `ImageNode`s with content (and thus no children). */
	public getLeavesInRegion(region: Rect2, minFractionOfRegion: number = 0): ImageNode[] {
		const result: ImageNode[] = [];

		// Don't render if too small
		if (this.bbox.maxDimension / region.maxDimension < minFractionOfRegion) {
			return [];
		}

		if (this.content != null && this.getBBox().intersects(region)) {
			result.push(this);
		}

		const children = this.getChildrenInRegion(region);
		for (const child of children) {
			result.push(...child.getLeavesInRegion(region, minFractionOfRegion));
			if (child.content) {
				result.push(child);
			}
		}

		return result;
	}

	public addLeaf(leaf: AbstractComponent): ImageNode {
		if (this.content == null && this.children.length === 0) {
			this.content = leaf;
			this.recomputeBBox();

			return this;
		} else {
			const newNode = new ImageNode(this);
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

	private changeParent(newParent: ImageNode) {
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
	private removeOutliers(target: ImageNode) {
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
			const newNode = new ImageNode(this);
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

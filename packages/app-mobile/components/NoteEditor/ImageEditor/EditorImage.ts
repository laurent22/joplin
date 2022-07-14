/**
 * A tree of nodes contained within the editor
 */

import ImageEditor from './editor';
import { Rect2 } from './math';
import AbstractRenderer from './rendering/AbstractRenderer';
import { Command } from './types';
import Viewport from './Viewport';

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

	public constructor(
		private readonly parent?: ImageNode<T>
	) {
		this.children = [];
		this.bbox = Rect2.empty;
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
				if (child.getBBox().maxDimension / maxDimen > maxChildFraction) {
					// Can we replace this with the child?
					if (this.children.length === 1) {
						this.children = child.children;
						this.content = child.content;
					} else {
						// Find a good split
						// TODO
					}
				}
			}
		}

		this.recomputeBBox();
	}

	private recomputeBBox() {
		if (this.content != null) {
			this.bbox = this.content.getBBox();
		} else {
			this.bbox = Rect2.empty;
			for (const child of this.children) {
				this.bbox = this.bbox.union(child.getBBox());
			}
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

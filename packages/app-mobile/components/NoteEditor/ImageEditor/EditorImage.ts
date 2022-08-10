import SVGEditor from './SVGEditor';
import AbstractRenderer from './rendering/AbstractRenderer';
import Command from './commands/Command';
import Viewport from './Viewport';
import AbstractComponent from './components/AbstractComponent';
import Rect2 from './geometry/Rect2';

/**
 * A tree of nodes contained within the editor
 */
export default class EditorImage {
	private root: ImageNode;
	public id: number = Math.random();

	public constructor() {
		this.root = new ImageNode();
	}

	private addElement(elem: AbstractComponent): ImageNode {
		return this.root.addLeaf(elem);
	}

	// Returns the parent of the given element, if it exists.
	public findParent(elem: AbstractComponent): ImageNode|null {
		const candidates = this.root.getLeavesInRegion(elem.getBBox());
		for (const candidate of candidates) {
			if (candidate.getContent() === elem) {
				return candidate;
			}
		}
		return null;
	}

	private sortLeaves(leaves: ImageNode[]) {
		leaves.sort((a, b) => a.getContent().zIndex - b.getContent().zIndex);
	}

	public render(renderer: AbstractRenderer, viewport: Viewport, minFraction: number = 0.001) {
		// Don't render components that are < 0.1% of the viewport.
		const leaves = this.root.getLeavesInRegion(viewport.visibleRect, minFraction);
		this.sortLeaves(leaves);

		for (const leaf of leaves) {
			leaf.getContent().render(renderer, viewport.visibleRect);
		}
	}

	// Renders all nodes, even ones not within the viewport
	public renderAll(renderer: AbstractRenderer) {
		const leaves = this.root.getLeaves();
		this.sortLeaves(leaves);

		for (const leaf of leaves) {
			leaf.getContent().render(renderer, leaf.getBBox());
		}
	}

	public getElementsIntersectingRegion(region: Rect2): AbstractComponent[] {
		const leaves = this.root.getLeavesInRegion(region);
		this.sortLeaves(leaves);
		return leaves.map(leaf => leaf.getContent());
	}

	public static AddElementCommand = class implements Command {
		private elementContainer: ImageNode;
		// If [applyByFlattening], then the rendered content of this element
		// is present on the display's wet ink canvas. As such, no re-render is necessary
		// the first time this command is applied (the surfaces are joined instead).
		public constructor(
			private readonly element: AbstractComponent,
			private applyByFlattening: boolean = false
		) {
		}

		public apply(editor: SVGEditor) {
			this.elementContainer = editor.image.addElement(this.element);

			if (!this.applyByFlattening) {
				editor.queueRerender();
			} else {
				this.applyByFlattening = false;
				editor.display.flatten();
			}
		}

		public unapply(editor: SVGEditor) {
			this.elementContainer?.remove();
			this.elementContainer = null;
			editor.queueRerender();
		}
	};
}

export type AddElementCommand = typeof EditorImage.AddElementCommand.prototype;


export class ImageNode {
	private content: AbstractComponent|null;
	private bbox: Rect2;
	private children: ImageNode[];
	private targetChildCount: number = 30;

	public constructor(
		private parent: ImageNode|null = null
	) {
		this.children = [];
		this.bbox = Rect2.empty;
		this.content = null;
	}

	public getContent(): AbstractComponent|null {
		return this.content;
	}

	public getParent(): ImageNode|null {
		return this.parent;
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
		if (this.bbox.maxDimension / region.maxDimension <= minFractionOfRegion) {
			return [];
		}

		if (this.content !== null && this.getBBox().intersects(region)) {
			result.push(this);
		}

		const children = this.getChildrenInRegion(region);
		for (const child of children) {
			result.push(...child.getLeavesInRegion(region, minFractionOfRegion));
		}

		return result;
	}

	// Returns a list of leaves with this as an ancestor.
	// Like getLeavesInRegion, but does not check whether ancestors are in a given rectangle
	public getLeaves(): ImageNode[] {
		if (this.content) {
			return [this];
		}

		const result: ImageNode[] = [];
		for (const child of this.children) {
			result.push(...child.getLeaves());
		}

		return result;
	}

	public addLeaf(leaf: AbstractComponent): ImageNode {
		if (this.content === null && this.children.length === 0) {
			this.content = leaf;
			this.recomputeBBox(true);

			return this;
		}

		if (this.content !== null) {
			console.assert(this.children.length === 0);

			const contentNode = new ImageNode(this);
			contentNode.content = this.content;
			this.content = null;
			this.children.push(contentNode);
			contentNode.recomputeBBox(false);
		}

		// If this node is contained within the leaf, make this and the leaf
		// share a parent.
		const leafBBox = leaf.getBBox();
		if (leafBBox.containsRect(this.getBBox())) {
			// Create a node for this' children and for the new content..
			const nodeForNewLeaf = new ImageNode(this);
			const nodeForChildren = new ImageNode(this);

			nodeForChildren.children = this.children;
			this.children = [nodeForNewLeaf, nodeForChildren];
			nodeForChildren.recomputeBBox(true);

			return nodeForNewLeaf.addLeaf(leaf);
		}

		const containingNodes = this.children.filter(
			child => child.getBBox().containsRect(leafBBox)
		);

		// Does the leaf already fit within one of the children?
		if (containingNodes.length > 0 && this.children.length >= this.targetChildCount) {
			// Sort the containers in ascending order by area
			containingNodes.sort((a, b) => a.getBBox().area - b.getBBox().area);

			// Choose the smallest child that contains the new element.
			const result = containingNodes[0].addLeaf(leaf);
			result.rebalance();
			return result;
		}


		const newNode = new ImageNode(this);
		this.children.push(newNode);
		newNode.content = leaf;
		newNode.recomputeBBox(true);

		return newNode;
	}

	public getBBox(): Rect2 {
		return this.bbox;
	}

	// Recomputes this' bounding box. If [bubbleUp], also recompute
	// this' ancestors bounding boxes
	public recomputeBBox(bubbleUp: boolean) {
		const oldBBox = this.bbox;
		if (this.content !== null) {
			this.bbox = this.content.getBBox();
		} else {
			this.bbox = Rect2.empty;

			for (const child of this.children) {
				this.bbox = this.bbox.union(child.getBBox());
			}
		}

		if (bubbleUp && !oldBBox.eq(this.bbox)) {
			this.parent?.recomputeBBox(true);
		}
	}

	private rebalance() {
		// If the current node is its parent's only child,
		if (this.parent && this.parent.children.length === 1) {
			console.assert(this.parent.content === null);
			console.assert(this.parent.children[0] === this);

			// Remove this' parent, if this' parent isn't the root.
			if (this.parent.parent !== null) {
				const oldParent = this.parent;
				oldParent.children = [];
				this.parent = oldParent.parent;
				this.parent.children.push(this);
				oldParent.parent = null;
				this.parent.recomputeBBox(false);
			} else if (this.content === null) {
				// Remove this and transfer this' children to the parent.
				this.parent.children = this.children;
				this.parent = null;
			}
		}
	}

	/** Remove this node and all of its children */
	public remove() {
		if (!this.parent) {
			this.content = null;
			this.children = [];

			return;
		}

		const oldChildCount = this.parent.children.length;
		this.parent.children = this.parent.children.filter(node => {
			return node !== this;
		});
		console.assert(this.parent.children.length === oldChildCount - 1);

		this.parent.children.forEach(child => {
			child.rebalance();
		});

		this.parent.recomputeBBox(true);

		// Invalidate/disconnect this.
		this.content = null;
		this.parent = null;
		this.children = [];
	}
}

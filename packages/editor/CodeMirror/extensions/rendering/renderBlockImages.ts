import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorState, StateEffect, Transaction } from '@codemirror/state';
import { RenderedContentContext } from './types';
import makeBlockReplaceExtension from './utils/makeBlockReplaceExtension';

const imageClassName = 'cm-md-image';

class ImageHeightCache {
	private readonly cache = new Map<string, number>();
	private readonly maxEntries = 500;

	public get(key: string): number | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			// Refresh recency
			this.cache.delete(key);
			this.cache.set(key, value);
		}
		return value;
	}

	public set(key: string, height: number): void {
		if (this.cache.has(key)) {
			this.cache.delete(key);
		} else if (this.cache.size >= this.maxEntries) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey) this.cache.delete(firstKey);
		}
		this.cache.set(key, height);
	}
}

const imageHeightCache = new ImageHeightCache();

class ImageWidget extends WidgetType {
	private resolvedSrc_: string;

	public constructor(
		private readonly context_: RenderedContentContext,
		private readonly src_: string,
		private readonly alt_: string,
		private readonly reloadCounter_ = 0,
		private readonly width_: string | null = null,
	) {
		super();
	}

	public eq(other: ImageWidget) {
		return this.src_ === other.src_ && this.alt_ === other.alt_ && this.reloadCounter_ === other.reloadCounter_ && this.width_ === other.width_;
	}

	public updateDOM(dom: HTMLElement): boolean {
		const image = dom.querySelector<HTMLImageElement>('img.image');
		if (!image) return false;

		image.ariaLabel = this.alt_;
		image.role = 'image';

		// Apply width if specified, otherwise clear it
		if (this.width_) {
			image.style.width = `${this.width_}px`;
			image.style.height = 'auto';
		} else {
			image.style.width = '';
			image.style.height = '';
		}

		const updateImageUrl = () => {
			if (this.resolvedSrc_) {
				image.src = this.resolvedSrc_;
				// When the image loads, measure and cache the height
				image.onload = () => {
					// Measure container height (what CodeMirror uses for scroll calculations).
					if (dom.isConnected) {
						imageHeightCache.set(this.cacheKey, dom.offsetHeight);
					}

					dom.style.minHeight = '';
				};
			}
		};

		if (!this.resolvedSrc_) {
			void (async () => {
				this.resolvedSrc_ = await this.context_.resolveImageSrc(this.src_, this.reloadCounter_);
				updateImageUrl();
			})();
		} else {
			updateImageUrl();
		}

		// Apply cached height as min-height to prevent collapse during load.
		const cached = imageHeightCache.get(this.cacheKey);
		if (cached) {
			dom.style.minHeight = `${cached}px`;
		}

		return true;
	}

	public toDOM(_view: EditorView) {
		const container = document.createElement('div');
		container.classList.add(imageClassName);

		const image = document.createElement('img');
		image.classList.add('image');

		container.appendChild(image);
		this.updateDOM(container);

		return container;
	}

	private get cacheKey() {
		return `${this.src_}_${this.width_ ?? ''}_${this.reloadCounter_}`;
	}

	public get estimatedHeight() {
		return imageHeightCache.get(this.cacheKey) ?? -1;
	}
}

const getImageSrc = (node: SyntaxNodeRef, state: EditorState) => {
	const nodeText = state.sliceDoc(node.from, node.to);
	// For now, only render Joplin resource images (avoid auto-fetching images from
	// the internet if just the Markdown editor is open).
	const match = nodeText.match(/:\/[a-zA-Z0-9]{32}/);
	if (match) {
		return match[0];
	} else {
		return null;
	}
};

const getImageAlt = (node: SyntaxNodeRef, state: EditorState) => {
	const nodeText = state.sliceDoc(node.from, node.to);

	const match = nodeText.match(/!\s*\[(.+)\]/);
	if (match) {
		return match[1];
	} else {
		return null;
	}
};

interface HtmlImageInfo {
	src: string;
	alt: string | null;
	width: string | null;
}

const parseHtmlImage = (node: SyntaxNodeRef, state: EditorState): HtmlImageInfo | null => {
	const nodeText = state.sliceDoc(node.from, node.to);

	// Check if this is an img tag (handles both /> and > closing styles)
	if (!nodeText.match(/<img\s/i)) {
		return null;
	}

	// Extract src (only Joplin resource images, accepts single or double quotes)
	const srcMatch = nodeText.match(/src=(["'])(:\/[a-zA-Z0-9]{32})\1/i);
	if (!srcMatch) {
		return null;
	}

	// Extract alt attribute (optional, accepts single or double quotes)
	const altMatch = nodeText.match(/alt=(["'])([^"']*)\1/i);

	// Extract width attribute (optional, accepts single or double quotes)
	const widthMatch = nodeText.match(/width=(["'])(\d+)\1/i);

	return {
		src: srcMatch[2],
		alt: altMatch ? altMatch[2] : null,
		width: widthMatch ? widthMatch[2] : null,
	};
};

// In Electron: To work around browser caching, these counters should continue to increase even if an old
// editor is destroyed and a new one is created in the same window.
const imageToRefreshCounters = new Map<string, number>();
export const resetImageResourceEffect = StateEffect.define<{ id: string }>();

// Intended only for automated tests.
export const testing__resetImageRefreshCounterCache = () => {
	imageToRefreshCounters.clear();
};

const renderBlockImages = (context: RenderedContentContext) => [
	EditorView.theme({
		[`& .${imageClassName} > .image`]: {
			maxWidth: '100%',
			minWidth: 0,
			display: 'block',

			// Center
			marginLeft: 'auto',
			marginRight: 'auto',
		},
	}),
	makeBlockReplaceExtension({
		createDecoration: (node, state) => {
			// Handle both markdown images and HTML img tags
			if (node.name === 'Image' || node.name === 'HTMLTag' || node.name === 'HTMLBlock') {
				const lineFrom = state.doc.lineAt(node.from);
				const lineTo = state.doc.lineAt(node.to);
				const textBefore = state.sliceDoc(lineFrom.from, node.from);
				const textAfter = state.sliceDoc(node.to, lineTo.to);

				// Only render images on their own line
				if (textBefore.trim() === '' && textAfter.trim() === '') {
					let src: string | null = null;
					let alt: string | null = null;
					let width: string | null = null;

					// Parse image data based on node type
					if (node.name === 'Image') {
						// Markdown image: ![alt](src)
						src = getImageSrc(node, state);
						alt = getImageAlt(node, state);
					} else {
						// HTML img tag: <img src="..." alt="..." width="..." />
						const imageInfo = parseHtmlImage(node, state);
						if (imageInfo) {
							src = imageInfo.src;
							alt = imageInfo.alt;
							width = imageInfo.width;
						}
					}

					if (src) {
						const isLastLine = lineTo.number === state.doc.lines;
						return Decoration.widget({
							widget: new ImageWidget(context, src, alt, imageToRefreshCounters.get(src) ?? 0, width),
							// "side: -1": In general, when the cursor is at the widget's location, it should be at
							// the start of the next line (and so "side" should be -1).
							//
							// "side: 1": However, when the widget is at the end of the document, the widget's
							// position is **one index less** than when it isn't (to prevent the widget's
							// position from being outside the document, which would break CodeMirror).
							// This means that we need "side: 1" to put the cursor before the widget
							// when at the end of the document.
							side: isLastLine ? 1 : -1,
							block: true,
						});
					}
				}
			}

			return null;
		},
		getDecorationRange: (node, state) => {
			const nodeLine = state.doc.lineAt(node.to);
			return [Math.min(nodeLine.to + 1, state.doc.length)];
		},
		hideWhenContainsSelection: false,

		shouldFullReRender: (transaction: Transaction) => {
			let hadRefreshEffect = false;
			for (const effect of transaction.effects) {
				if (effect.is(resetImageResourceEffect)) {
					const key = `:/${effect.value.id}`;
					imageToRefreshCounters.set(key, (imageToRefreshCounters.get(key) ?? 0) + 1);
					hadRefreshEffect = true;
				}
			}
			return hadRefreshEffect;
		},
	}),
];

export default renderBlockImages;

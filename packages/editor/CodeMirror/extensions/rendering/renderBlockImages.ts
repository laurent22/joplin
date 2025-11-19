import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorState, StateEffect, Transaction } from '@codemirror/state';
import { RenderedContentContext } from './types';
import makeBlockReplaceExtension from './utils/makeBlockReplaceExtension';

const imageClassName = 'cm-md-image';

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

		// Apply width if specified
		if (this.width_) {
			image.style.width = `${this.width_}px`;
			image.style.height = 'auto';
		}

		const updateImageUrl = () => {
			if (this.resolvedSrc_) {
				// Use a background-image style property rather than img[src=]. This
				// simplifies setting the image to the correct size/position.
				image.src = this.resolvedSrc_;
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

		return true;
	}

	public toDOM() {
		const container = document.createElement('div');
		container.classList.add(imageClassName);

		const image = document.createElement('img');
		image.classList.add('image');

		// Apply width if specified
		if (this.width_) {
			image.style.width = `${this.width_}px`;
			image.style.height = 'auto';
		}

		container.appendChild(image);
		this.updateDOM(container);

		return container;
	}

	public get estimatedHeight() {
		return -1;
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

	// Extract src (only Joplin resource images with double quotes)
	const srcMatch = nodeText.match(/src="(:\/[a-zA-Z0-9]{32})"/i);
	if (!srcMatch) {
		return null;
	}

	// Extract alt attribute (optional)
	const altMatch = nodeText.match(/alt="([^"]*)"/i);

	// Extract width attribute (optional)
	const widthMatch = nodeText.match(/width="(\d+)"/i);

	return {
		src: srcMatch[1],
		alt: altMatch ? altMatch[1] : null,
		width: widthMatch ? widthMatch[1] : null,
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
			// Handle markdown images
			if (node.name === 'Image') {
				const lineFrom = state.doc.lineAt(node.from);
				const lineTo = state.doc.lineAt(node.to);
				const textBefore = state.sliceDoc(lineFrom.from, node.from);
				const textAfter = state.sliceDoc(node.to, lineTo.to);
				if (textBefore.trim() === '' && textAfter.trim() === '') {
					const src = getImageSrc(node, state);
					const alt = getImageAlt(node, state);

					if (src) {
						const isLastLine = lineTo.number === state.doc.lines;
						return Decoration.widget({
							widget: new ImageWidget(context, src, alt, imageToRefreshCounters.get(src) ?? 0, null),
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

			// Handle HTML img tags (both HTMLTag for self-closing and HTMLBlock for non-self-closing)
			if (node.name === 'HTMLTag' || node.name === 'HTMLBlock') {
				const lineFrom = state.doc.lineAt(node.from);
				const lineTo = state.doc.lineAt(node.to);
				const textBefore = state.sliceDoc(lineFrom.from, node.from);
				const textAfter = state.sliceDoc(node.to, lineTo.to);
				if (textBefore.trim() === '' && textAfter.trim() === '') {
					const imageInfo = parseHtmlImage(node, state);

					if (imageInfo) {
						const isLastLine = lineTo.number === state.doc.lines;
						return Decoration.widget({
							widget: new ImageWidget(
								context,
								imageInfo.src,
								imageInfo.alt ?? '',
								imageToRefreshCounters.get(imageInfo.src) ?? 0,
								imageInfo.width,
							),
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

import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorState } from '@codemirror/state';
import { RenderedContentContext } from './types';
import makeBlockReplaceExtension from './utils/makeBlockReplaceExtension';

const imageClassName = 'cm-md-image';
// Pre-set the image height for performance (allows CodeMirror to better calculate
// the document height while scrolling).
const imageHeight = 200;

class ImageWidget extends WidgetType {
	private resolvedSrc_: string;

	public constructor(
		private readonly context_: RenderedContentContext,
		private readonly src_: string,
		private readonly alt_: string,
	) {
		super();
	}

	public eq(other: ImageWidget) {
		return this.src_ === other.src_ && this.alt_ === other.alt_;
	}

	public toDOM() {
		const container = document.createElement('div');
		container.classList.add(imageClassName);

		const image = document.createElement('div');
		image.role = 'image';
		image.ariaLabel = this.alt_;
		image.classList.add('image');

		const updateImageUrl = () => {
			if (this.resolvedSrc_) {
				// Use a background-image style property rather than img[src=]. This
				// simplifies setting the image to the correct size/position.
				image.style.backgroundImage = `url(${JSON.stringify(this.resolvedSrc_)})`;
			}
		};

		if (!this.resolvedSrc_) {
			void (async () => {
				this.resolvedSrc_ = await this.context_.resolveImageSrc(this.src_);
				updateImageUrl();
			})();
		} else {
			updateImageUrl();
		}

		container.appendChild(image);
		return container;
	}

	public get estimatedHeight() {
		return imageHeight;
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

const renderBlockImages = (context: RenderedContentContext) => [
	EditorView.theme({
		[`& .${imageClassName} > div`]: {
			height: `${imageHeight}px`,
			backgroundSize: 'contain',
			backgroundRepeat: 'no-repeat',
			backgroundPosition: 'center',
			display: 'block',
		},
	}),
	makeBlockReplaceExtension({
		createDecoration: (node, state) => {
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
							widget: new ImageWidget(context, src, alt),
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
	}),
];

export default renderBlockImages;

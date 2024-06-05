import type { Editor } from 'tinymce';
import { useEffect } from 'react';
import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';

const useStyles = (editor: Editor|null, themeId: number) => {
	useEffect(() => {
		if (!editor) {
			return () => {};
		}

		const theme = themeStyle(themeId);
		const style = document.createElement('style');
		style.appendChild(document.createTextNode(`
			@keyframes show-tooltip {
				0% { opacity: 0; }
				100% { opacity: 0.8; }
			}
			.joplin-link-tooltip {
				padding-bottom: 10px;

				visibility: hidden;
				opacity: 0;
				pointer-events: none;

				display: inline-block;
				position: fixed;

				transition: 0.2s ease opacity;
			}
			.joplin-link-tooltip > div {
				background-color: ${theme.backgroundColor2};
				color: ${theme.color2};

				padding: 4px;
				border-radius: 4px;
			}

			.joplin-link-tooltip.-visible {
				visibility: visible;
				opacity: 0.8;
			}
		`));
		document.head.appendChild(style);

		return () => {
			style.remove();
		};
	}, [editor, themeId]);
};

const useLinkTooltips = (editor: Editor|null, themeId: number) => {
	useStyles(editor, themeId);

	useEffect(() => {
		if (!editor) return () => {};

		const tooltip = document.createElement('div');
		const tooltipContent = document.createElement('div');
		tooltip.replaceChildren(tooltipContent);
		tooltip.ariaLive = 'polite';
		tooltip.classList.add('joplin-link-tooltip');
		document.body.appendChild(tooltip);

		let showAtTimeout: ReturnType<typeof setTimeout>|null = null;
		const cancelShowTooltip = () => {
			if (showAtTimeout) {
				clearTimeout(showAtTimeout);
				showAtTimeout = null;
			}
		};
		const showTooltipAt = (x: number, y: number) => {
			cancelShowTooltip();

			const delay = 700;
			showAtTimeout = setTimeout(() => {
				x = Math.max(0, Math.min(window.innerWidth - tooltip.clientWidth, x));

				tooltip.style.left = `${x}px`;
				tooltip.style.top = `${y}px`;
				tooltip.classList.add('-visible');
			}, delay);
		};

		const hideTooltip = () => {
			tooltip.classList.remove('-visible');
			tooltipContent.textContent = '';
			cancelShowTooltip();
		};

		const onMouseOver = (event: MouseEvent) => {
			let element = event.target as HTMLElement;
			let counter = 0;
			while (element.tagName !== 'A' || !('href' in element)) {
				element = element.parentElement;
				if (!element || counter++ > 5) {
					return;
				}
			}

			if (shim.isMac()) {
				tooltipContent.textContent = _('cmd+click to open: %s', element.title || element.href);
			} else {
				tooltipContent.textContent = _('ctrl+click to open: %s', element.title || element.href);
			}

			const bbox = element.getBoundingClientRect();
			const frameBBox = editor.getContentAreaContainer().getBoundingClientRect();

			// Position just below the element.
			showTooltipAt(
				bbox.left + bbox.width / 2 + frameBBox.left - tooltip.clientWidth / 2,
				bbox.top - tooltip.clientHeight + frameBBox.top,
			);

			const onMouseLeave = () => {
				hideTooltip();
				element.removeEventListener('mouseleave', onMouseLeave);
			};
			element.addEventListener('mouseleave', onMouseLeave);
		};

		const clearEventListeners = () => {
			editor.getDoc().removeEventListener('mouseover', onMouseOver);
		};

		const rebuildEventListeners = () => {
			clearEventListeners();

			editor.getDoc().addEventListener('mouseover', onMouseOver, false);
		};
		rebuildEventListeners();
		editor.on('SetContent', rebuildEventListeners);
		editor.on('keyup', hideTooltip);
		editor.on('click', hideTooltip);

		return () => {
			editor.off('SetContent', rebuildEventListeners);
			tooltip.remove();
			clearEventListeners();
		};
	}, [editor]);
};

export default useLinkTooltips;

import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import { useMemo } from 'react';
import { extname } from 'path';
import shim from '@joplin/lib/shim';
const Icon = require('react-native-vector-icons/Ionicons').default;

export const editPopupClass = 'joplin-editPopup';

const getEditIconSrc = (theme: Theme) => {
	const iconUri = Icon.getImageSourceSync('pencil', 20, theme.color2).uri;

	// Copy to a location that can be read within a WebView
	// (necessary on iOS)
	const destPath = `${Setting.value('resourceDir')}/edit-icon.${extname(iconUri)}`;

	// Copy in the background -- the edit icon popover script doesn't need the
	// icon immediately.
	void (async () => {
		await shim.fsDriver().copy(iconUri, destPath);
	})();

	return destPath;
};

// Creates JavaScript/CSS that can be used to create an "Edit" button.
// Exported to facilitate testing.
export const getEditPopupSource = (theme: Theme) => {
	const fadeOutDelay = 400;
	const editPopupDestroyDelay = 5000;

	const editPopupCss = `
		@keyframes fade-in {
			0% { opacity: 0; }
			100% { opacity: 1; }
		}

		@keyframes fade-out {
			0% { opacity: 1; }
			100% { opacity: 0; }
		}

		.${editPopupClass} {
			display: inline-block;
			position: relative;

			/* Don't take up any space in the line, overlay the button */
			width: 0;
			height: 0;
			overflow: visible;

			--edit-popup-width: 40px;
			--edit-popup-padding: 10px;

			/* Shift the popup such that it overlaps with the previous element. */
			left: calc(0px - var(--edit-popup-width));

			/* Match the top of the image */
			vertical-align: top;
		}

		.${editPopupClass} > button {
			padding: var(--edit-popup-padding);
			width: var(--edit-popup-width);

			animation: fade-in 0.4s ease;

			background-color: ${theme.backgroundColor2};
			color: ${theme.color2};

			border: none;
		}

		.${editPopupClass} img {
			/* Make the image take up as much space as possible (minus padding) */
			width: calc(var(--edit-popup-width) - var(--edit-popup-padding));
		}

		.${editPopupClass}.fadeOut {
			animation: fade-out ${fadeOutDelay}ms ease;
		}
	`;


	const destroyEditPopupSyntax = `() => {
		if (!window.editPopup) {
			return;
		}

		const popup = editPopup;
		popup.classList.add('fadeOut');
		window.editPopup = null;

		setTimeout(() => {
			popup.remove();
		}, ${fadeOutDelay});
	}`;

	const createEditPopupSyntax = `(parent, resourceId, onclick) => {
		if (window.editPopupTimeout) {
			clearTimeout(window.editPopupTimeout);
			window.editPopupTimeout = undefined;
		}

		window.editPopupTimeout = setTimeout(${destroyEditPopupSyntax}, ${editPopupDestroyDelay});

		if (window.lastEditPopupTarget !== parent) {
			(${destroyEditPopupSyntax})();
		} else if (window.editPopup) {
			return;
		}

		window.editPopup = document.createElement('div');
		const popupButton = document.createElement('button');

		const popupIcon = new Image();
		popupIcon.alt = ${JSON.stringify(_('Edit'))};
		popupIcon.title = popupIcon.alt;
		popupIcon.src = ${JSON.stringify(getEditIconSrc(theme))};
		popupButton.appendChild(popupIcon);

		popupButton.onclick = onclick;
		editPopup.appendChild(popupButton);

		editPopup.classList.add(${JSON.stringify(editPopupClass)});
		parent.insertAdjacentElement('afterEnd', editPopup);

		// Ensure that the edit popup is focused immediately by screen
		// readers.
		editPopup.focus();
		window.lastEditPopupTarget = parent;
	}`;

	return { createEditPopupSyntax, destroyEditPopupSyntax, editPopupCss };
};

const useEditPopup = (themeId: number) => {
	return useMemo(() => {
		return getEditPopupSource(themeStyle(themeId));
	}, [themeId]);
};

export default useEditPopup;

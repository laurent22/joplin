import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import { useMemo } from 'react';
const Icon = require('react-native-vector-icons/Ionicons').default;

export const editPopupClass = 'joplin-editPopup';

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
			position: absolute;
			animation: fade-in 0.4s ease;

			background-color: ${theme.backgroundColor2};
			color: ${theme.color2};

			padding: 10px;
			border: none;
		}

		.${editPopupClass} img {
			max-width: 20px;
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

	const editIcon = Icon.getImageSourceSync('pencil', 20, theme.color2);

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

		window.editPopup = document.createElement('button');

		const popupLabel = document.createElement('div');
		popupLabel.innerText = ${JSON.stringify(_('Edit'))};

		const popupIcon = new Image();
		popupIcon.src = ${JSON.stringify(editIcon.uri)};

		editPopup.classList.add(${JSON.stringify(editPopupClass)});
		editPopup.onclick = onclick;

		editPopup.replaceChildren(popupIcon, popupLabel);

		parent.insertAdjacentElement('beforeBegin', editPopup);

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

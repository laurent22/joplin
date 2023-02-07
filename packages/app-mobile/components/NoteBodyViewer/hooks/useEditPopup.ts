import { _ } from '@joplin/lib/locale';
import { useMemo } from 'react';

export const editPopupClass = 'joplin-editPopup';

// Creates JavaScript/CSS that can be used to create an "Edit" button.
// Exported to facilitate testing.
export const getEditPopupSource = () => {
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

			background-color: black;
			color: white;
			box-shadow: 0px 0px 3px rgba(200, 200, 200, 0.4);

			padding: 10px;
			border: none;
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

		window.editPopup = document.createElement('button');
		editPopup.innerText = ${JSON.stringify(_('Edit'))}
		editPopup.classList.add(${JSON.stringify(editPopupClass)});
		editPopup.onclick = onclick;

		parent.insertAdjacentElement('beforeBegin', editPopup);
		window.lastEditPopupTarget = parent;
	}`;

	return { createEditPopupSyntax, destroyEditPopupSyntax, editPopupCss };
};

const useEditPopup = () => {
	return useMemo(getEditPopupSource, []);
};

export default useEditPopup;

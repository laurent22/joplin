import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('announceForAccessibility');

const announceForAccessibility = (message: string) => {
	const id = 'joplin-announce-for-accessibility-live-region';
	let announcementArea = document.querySelector(`#${id}`);

	if (!announcementArea) {
		announcementArea = document.createElement('div');
		announcementArea.ariaLive = 'polite';
		announcementArea.role = 'status';
		announcementArea.id = id;
		announcementArea.classList.add('visually-hidden');

		document.body.appendChild(announcementArea);
	} else {
		// Allows messages to be re-announced.
		announcementArea.textContent = '';
	}

	// Defer the announcement. Because `aria-live: polite` causes **changes** in
	// content to be announced, a slight delay is needed when there would otherwise
	// be no change in content.
	const announce = () => {
		logger.debug('Announcing:', message);
		announcementArea.textContent = message;
	};
	shim.setTimeout(announce, 100);
};

export default announceForAccessibility;

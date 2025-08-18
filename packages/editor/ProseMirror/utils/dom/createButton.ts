import { LocalizationResult } from '../../../types';
import createTextNode from './createTextNode';

type OnClick = ()=> void;

const createButton = (label: LocalizationResult, onClick: OnClick) => {
	const button = document.createElement('button');
	button.appendChild(createTextNode(label));

	// Works around an issue on iOS in which certain <button> elements within the selected
	// region of a contenteditable container do not emit a "click" event when tapped with a touchscreen.
	const applyIOSClickWorkaround = () => {
		// touchend events can be received even when a touch is no longer contained within
		// the initial element.
		const buttonContainsTouch = (touch: Touch) => {
			return document.elementFromPoint(touch.clientX, touch.clientY) === button;
		};

		let containedTouchStart = false;
		button.addEventListener('touchcancel', () => {
			containedTouchStart = false;
		});
		button.addEventListener('touchstart', () => {
			containedTouchStart = true;
		});
		button.addEventListener('touchend', (event) => {
			if (containedTouchStart && event.touches.length === 0 && buttonContainsTouch(event.changedTouches[0])) {
				onClick();
				event.preventDefault();
			}
			containedTouchStart = false;
		});
	};

	applyIOSClickWorkaround();
	button.onclick = onClick;

	return button;
};

export default createButton;

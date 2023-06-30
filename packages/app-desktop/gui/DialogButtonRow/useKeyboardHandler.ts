import { useEffect, useState, useRef, useCallback } from 'react';
import { isInsideContainer } from '@joplin/lib/dom';

interface Props {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onOkButtonClick: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onCancelButtonClick: Function;
}

const globalKeydownHandlers: string[] = [];

export default (props: Props) => {
	const [elementId] = useState(`${Math.round(Math.random() * 10000000)}`);
	const globalKeydownHandlersRef = useRef(globalKeydownHandlers);

	useEffect(() => {
		globalKeydownHandlersRef.current.push(elementId);
		return () => {
			const idx = globalKeydownHandlersRef.current.findIndex(e => e === elementId);
			// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
			globalKeydownHandlersRef.current.splice(idx, 1);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	const isTopDialog = () => {
		const ln = globalKeydownHandlersRef.current.length;
		return ln && globalKeydownHandlersRef.current[ln - 1] === elementId;
	};

	const isInSubModal = (targetElement: any) => {
		// If we are inside a sub-modal within the dialog, we shouldn't handle
		// global key events. It can be for example the emoji picker. In general
		// it's difficult to know whether an element is a modal or not, so we'll
		// have to add special cases here. Normally there shouldn't be many of
		// these.
		if (isInsideContainer(targetElement, 'emoji-picker')) return true;
		return false;
	};

	const onKeyDown = useCallback((event: any) => {
		// Early exit if it's neither ENTER nor ESCAPE, because isInSubModal
		// function can be costly.
		if (event.keyCode !== 13 && event.keyCode !== 27) return;

		if (!isTopDialog() || isInSubModal(event.target)) return;

		if (event.keyCode === 13) {
			if (event.target.nodeName !== 'TEXTAREA') {
				props.onOkButtonClick();
			}
		} else if (event.keyCode === 27) {
			props.onCancelButtonClick();
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.onOkButtonClick, props.onCancelButtonClick]);

	useEffect(() => {
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [onKeyDown]);

	return onKeyDown;
};

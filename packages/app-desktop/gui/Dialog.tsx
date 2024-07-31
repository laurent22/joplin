import * as React from 'react';
import { MouseEventHandler, ReactEventHandler, ReactNode, useCallback, useEffect, useRef, useState } from 'react';

interface Props {
	className?: string;
	onCancel?: ()=> void;
	contentStyle?: React.CSSProperties;
	children: ReactNode;
}

export default function Dialog(props: Props) {
	const [dialogElement, setDialogRef] = useState<HTMLDialogElement>();

	useEffect(() => {
		if (!dialogElement) return;

		// Use .showModal instead of the open attribute: .showModal correctly
		// traps the keyboard focus in the dialog
		dialogElement.showModal();
	}, [dialogElement]);

	const onCancelRef = useRef(props.onCancel);
	onCancelRef.current = props.onCancel;

	const onCancel: ReactEventHandler<HTMLDialogElement> = useCallback((event) => {
		const canCancel = !!onCancelRef.current;
		if (!canCancel) {
			// Prevents [Escape] from closing the dialog. In many places, this is handled
			// elsewhere.
			// See https://stackoverflow.com/a/61021326
			event.preventDefault();
		}
	}, []);

	const onContainerClick: MouseEventHandler<HTMLDialogElement> = useCallback((event) => {
		const onCancel = onCancelRef.current;
		if (event.target === dialogElement && onCancel) {
			onCancel();
		}
	}, [dialogElement]);

	return (
		<dialog
			ref={setDialogRef}
			className={`dialog-modal-layer ${props.className}`}
			onClose={props.onCancel}
			onCancel={onCancel}
			onClick={onContainerClick}
		>
			<div className='content' style={props.contentStyle}>
				{props.children}
			</div>
		</dialog>
	);
}

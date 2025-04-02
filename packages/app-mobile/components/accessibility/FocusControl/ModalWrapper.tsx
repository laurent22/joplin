import * as React from 'react';
import { useContext, useEffect, useId } from 'react';
import { FocusControlContext } from './FocusControlProvider';
import { ModalState } from './types';

interface Props {
	children: React.ReactNode;
	state: ModalState;
}

// A wrapper component that notifies the focus handler that a modal-like component
// is visible. Modals that capture focus should wrap their content in this component.
const ModalWrapper: React.FC<Props> = props => {
	const { setModalState: setDialogState } = useContext(FocusControlContext);
	const id = useId();
	useEffect(() => {
		if (!setDialogState) {
			throw new Error('ModalContent components must have a FocusControlProvider as an ancestor. Is FocusControlProvider part of the provider stack?');
		}
		setDialogState(id, props.state);
	}, [id, props.state, setDialogState]);

	useEffect(() => {
		return () => {
			setDialogState?.(id, ModalState.Closed);
		};
	}, [id, setDialogState]);

	return <>
		{props.children}
	</>;
};

export default ModalWrapper;

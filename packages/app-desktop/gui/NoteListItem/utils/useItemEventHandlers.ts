import { OnClick, OnInputChange } from './types';
import { useMemo } from 'react';
import { ItemEventHandlers } from './types';

const useItemEventHandlers = (onInputChange: OnInputChange, onClick: OnClick | null): ItemEventHandlers => {
	return useMemo(() => ({ onInputChange, onClick }), [onInputChange, onClick]);
};

export default useItemEventHandlers;

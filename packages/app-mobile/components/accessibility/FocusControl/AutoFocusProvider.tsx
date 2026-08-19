import * as React from 'react';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type AutoFocusCallback = ()=> void;

interface AutoFocusControl {
	// It isn't always possible to autofocus (e.g. due to a dialog obscuring focus).
	canAutoFocus(): boolean;

	// Sets the callback to be triggered when it becomes possible to autofocus
	setAutofocusCallback(callback: AutoFocusCallback): void;
	removeAutofocusCallback(callback: AutoFocusCallback): void;
}

export const AutoFocusContext = createContext<AutoFocusControl|null>(null);

interface Props {
	children: React.ReactNode;
	allowAutoFocus: boolean;
}

const AutoFocusProvider: React.FC<Props> = ({ allowAutoFocus, children }) => {
	const [autoFocusCallback, setAutofocusCallback] = useState<AutoFocusCallback|null>(null);
	const allowAutoFocusRef = useRef(allowAutoFocus);
	allowAutoFocusRef.current = allowAutoFocus;

	useEffect(() => {
		if (allowAutoFocus && autoFocusCallback) {
			autoFocusCallback();
			setAutofocusCallback(null);
		}
	}, [autoFocusCallback, allowAutoFocus]);

	const removeAutofocusCallback = useCallback((toRemove: AutoFocusCallback) => {
		setAutofocusCallback(callback => {
			// Update the callback only if it's different
			if (callback === toRemove) {
				return null;
			} else {
				return callback;
			}
		});
	}, []);

	const autoFocusControl = useMemo((): AutoFocusControl => {
		return {
			canAutoFocus: () => {
				return allowAutoFocusRef.current;
			},
			setAutofocusCallback: (callback) => {
				setAutofocusCallback(() => callback);
			},
			removeAutofocusCallback,
		};
	}, [removeAutofocusCallback, setAutofocusCallback]);

	return <AutoFocusContext.Provider value={autoFocusControl}>
		{children}
	</AutoFocusContext.Provider>;
};

export default AutoFocusProvider;

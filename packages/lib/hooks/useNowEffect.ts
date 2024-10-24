import type * as React from 'react';
import shim from '../shim';

type CleanupCallback = (()=> void)|null;
export type EffectFunction = ()=> CleanupCallback;
const { useRef, useMemo, useEffect } = shim.react();

// Like useEffect, but runs as soon as possible.
const useNowEffect = (effect: EffectFunction, dependencies: React.DependencyList) => {
	const lastCleanup = useRef<CleanupCallback>(null);

	const cleanupCallback = useMemo(() => {
		lastCleanup.current?.();
		lastCleanup.current = null;

		return effect() ?? null;
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- This is a custom hook
	}, dependencies);
	lastCleanup.current = cleanupCallback;

	useEffect(() => {
		return () => {
			lastCleanup.current?.();
			lastCleanup.current = null;
		};
	}, []);
};
export default useNowEffect;

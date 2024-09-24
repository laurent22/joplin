import type * as React from 'react';
import shim from '../shim';
import AsyncActionQueue from '../AsyncActionQueue';
const { useEffect, useState } = shim.react();

interface AsyncEffectEvent {
	cancelled: boolean;
}

export type EffectFunction = (event: AsyncEffectEvent)=> void|Promise<void>;

export interface Options {
	interval?: number;
}

export default (
	effect: EffectFunction,
	dependencies: React.DependencyList,
	{ interval = undefined }: Options = {},
) => {
	const [queue] = useState(() => new AsyncActionQueue(interval));
	useEffect(() => {
		const event: AsyncEffectEvent = { cancelled: false };
		queue.push(() => effect(event));
		return () => {
			event.cancelled = true;
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- This is a custom hook
	}, dependencies);

	useEffect(() => {
		return () => {
			void queue.reset();
		};
	}, [queue]);
};

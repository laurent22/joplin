import shim from '../shim';
const { useEffect } = shim.react();

type CleanupCallback = ()=> void;

export interface AsyncEffectEvent {
	cancelled: boolean;
	onCleanup: (callback: CleanupCallback)=> void;
}

export type EffectFunction = (event: AsyncEffectEvent)=> Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function(effect: EffectFunction, dependencies: any[]) {
	useEffect(() => {
		const onCleanupCallbacks: CleanupCallback[] = [];
		const event: AsyncEffectEvent = {
			cancelled: false,
			onCleanup: (callback) => {
				if (event.cancelled) {
					callback();
				} else {
					onCleanupCallbacks.push(callback);
				}
			},
		};
		void effect(event);
		return () => {
			event.cancelled = true;

			for (const callback of onCleanupCallbacks) {
				callback();
			}
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, dependencies);
}

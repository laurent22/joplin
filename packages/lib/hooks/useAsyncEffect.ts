import shim from '../shim';
const { useEffect } = shim.react();

export interface AsyncEffectEvent {
	cancelled: boolean;
}

export type EffectFunction = (event: AsyncEffectEvent)=> Promise<void>;

export default function(effect: EffectFunction, dependencies: any[]) {
	useEffect(() => {
		const event: AsyncEffectEvent = { cancelled: false };
		void effect(event);
		return () => {
			event.cancelled = true;
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, dependencies);
}

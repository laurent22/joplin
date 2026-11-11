import usePrevious from './usePrevious';
import { EffectCallback, useEffect } from 'react';

export default function useEffectDebugger(effectHook: EffectCallback, dependencies: unknown[], dependencyNames: string[] = []) {
	const previousDeps = usePrevious(dependencies, []);

	const changedDeps = dependencies.reduce((accum: Record<string, { before: unknown; after: unknown }>, dependency: unknown, index: number) => {
		if (dependency !== previousDeps[index]) {
			const keyName = dependencyNames[index] || index;
			return {
				...accum,
				[keyName]: {
					before: previousDeps[index],
					after: dependency,
				},
			};
		}

		return accum;
	}, {});

	if (Object.keys(changedDeps).length) {
		// eslint-disable-next-line no-console
		console.log('[use-effet-debugger] ', changedDeps);
	}

	// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	useEffect(effectHook, dependencies);
}

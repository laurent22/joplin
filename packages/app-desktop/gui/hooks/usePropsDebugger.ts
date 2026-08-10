// Use this to show which props have been changed within a component.
//
// Usage: usePropsDebugger(props);

import useEffectDebugger from './useEffectDebugger';

export default function usePropsDebugger(props: Record<string, unknown>) {
	const dependencies: unknown[] = [];
	const dependencyNames: string[] = [];

	for (const k in props) {
		dependencies.push(props[k]);
		dependencyNames.push(k);
	}

	useEffectDebugger(() => {}, dependencies, dependencyNames);
}

// Use this to show which props have been changed within a component.
//
// Usage: usePropsDebugger(props);

import useEffectDebugger from './useEffectDebugger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function usePropsDebugger(props: any) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const dependencies: any[] = [];
	const dependencyNames: string[] = [];

	for (const k in props) {
		dependencies.push(props[k]);
		dependencyNames.push(k);
	}

	useEffectDebugger(() => {}, dependencies, dependencyNames);
}

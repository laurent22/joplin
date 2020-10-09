import useEffectDebugger from './useEffectDebugger';

export default function usePropsDebugger(effectHook:any, props:any) {
	const dependencies:any[] = [];
	const dependencyNames:string[] = [];

	for (const k in props) {
		dependencies.push(props[k]);
		dependencyNames.push(k);
	}

	useEffectDebugger(effectHook, dependencies, dependencyNames);
}

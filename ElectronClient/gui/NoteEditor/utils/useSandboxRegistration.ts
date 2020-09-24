import { useEffect } from 'react';
import SandboxImplementation from '../../../plugin_service/SandboxImplementation';

export default function useSandboxRegistration(ref:any) {
	useEffect(() => {
		SandboxImplementation.instance().registerComponent('textEditor', ref);

		return () => {
			SandboxImplementation.instance().unregisterComponent('textEditor');
		};
	}, []);
}

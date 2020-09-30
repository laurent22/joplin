import { useEffect } from 'react';
import SandboxImplementation from '../../../services/plugins/SandboxImplementation';

export default function useSandboxRegistration(ref:any) {
	useEffect(() => {
		SandboxImplementation.instance().registerComponent('textEditor', ref);

		return () => {
			SandboxImplementation.instance().unregisterComponent('textEditor');
		};
	}, []);
}

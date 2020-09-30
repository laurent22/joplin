import { useEffect } from 'react';
import PlatformImplementation from '../../../services/plugins/PlatformImplementation';

export default function useSandboxRegistration(ref:any) {
	useEffect(() => {
		PlatformImplementation.instance().registerComponent('textEditor', ref);

		return () => {
			PlatformImplementation.instance().unregisterComponent('textEditor');
		};
	}, []);
}

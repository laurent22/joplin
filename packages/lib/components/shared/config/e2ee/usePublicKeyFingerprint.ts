import { formatPublicKeyFingerprint, ppkPublicKeyFingerprint, PublicPrivateKeyPair } from '../../../../services/e2ee/ppk/ppk';
import useAsyncEffect from '../../../../hooks/useAsyncEffect';
import shim from '../../../../shim';

const usePublicKeyFingerprint = (ppk: PublicPrivateKeyPair) => {
	const { useState } = shim.react();
	const [fingerprint, setFingerprint] = useState('');

	useAsyncEffect(async event => {
		if (!ppk) {
			setFingerprint('');
			return;
		}

		const fingerprint = await ppkPublicKeyFingerprint(ppk);
		if (event.cancelled) return;
		setFingerprint(formatPublicKeyFingerprint(fingerprint));
	}, [ppk]);

	return fingerprint;
};

export default usePublicKeyFingerprint;

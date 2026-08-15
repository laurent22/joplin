import shim from '../../shim';
import { getCACertificates, setDefaultCACertificates } from 'node:tls';

let defaultCaCerts_: string[]|null = null;
const defaultCaCerts = () => {
	defaultCaCerts_ ??= getCACertificates();
	return defaultCaCerts_;
};

let cacheKey = '[]';
const setExtraRootCertificates = async (paths: string[]) => {
	const newCacheKey = JSON.stringify(paths);
	if (newCacheKey === cacheKey) return;
	cacheKey = newCacheKey;

	const cas = [...defaultCaCerts()];
	for (const caPath of paths) {
		const path = caPath.trim();
		if (!path) continue;

		const certificateData = await shim.fsDriver().readFile(path, 'utf-8');
		cas.push(certificateData);
	}

	setDefaultCACertificates(cas);
};

export default setExtraRootCertificates;

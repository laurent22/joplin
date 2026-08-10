import shim from '../shim';
import { getCACertificates, setDefaultCACertificates } from 'node:tls';

let cacheKey = '[]';
const setExtraRootCertificates = async (paths: string[]) => {
	if (JSON.stringify(paths) === cacheKey) return;
	cacheKey = JSON.stringify(paths);

	const cas = [...getCACertificates()];
	for (const caPath of paths) {
		const path = caPath.trim();
		if (!path) continue;

		const certificateData = await shim.fsDriver().readFile(path, 'utf-8');
		cas.push(certificateData);
	}

	setDefaultCACertificates(cas);
};

export default setExtraRootCertificates;

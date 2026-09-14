import { join } from 'node:path';
import shim from '../../shim';
import { getCACertificates, setDefaultCACertificates } from 'node:tls';

let defaultCaCerts_: string[]|null = null;
const defaultCaCerts = () => {
	defaultCaCerts_ ??= getCACertificates();
	return defaultCaCerts_;
};

type Cert = {
	path: string; pem?: undefined;
} | {
	pem: string; path?: undefined;
};

let cacheKey = '[]';
const setExtraRootCertificates = async (certs: Cert[]) => {
	const newCacheKey = JSON.stringify(certs);
	if (newCacheKey === cacheKey) return;

	const cas = [...defaultCaCerts(), ...await readCertData(certs)];
	setDefaultCACertificates(cas);
	cacheKey = newCacheKey;
};

const readCertData = async (certs: Cert[]) => {
	const certData: string[] = [];
	for (const cert of certs) {
		if (cert.pem) {
			certData.push(cert.pem);
		} else {
			let filePaths;
			if (await shim.fsDriver().isDirectory(cert.path)) {
				filePaths = (await shim.fsDriver().readDirStats(cert.path))
					.filter(stat => !stat.isDirectory())
					.map(stat => join(cert.path, stat.path));
			} else {
				filePaths = [cert.path];
			}

			for (const filePath of filePaths) {
				certData.push(await shim.fsDriver().readFile(filePath, 'utf-8'));
			}
		}
	}
	return certData;
};

export default setExtraRootCertificates;

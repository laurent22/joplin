import { join } from 'path';
import shim, { SetClientCertificateOptions } from '../../shim';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('loadClientCertificate');

export interface LoadClientCertificateSettings {
	'net.clientCertificate': string;
	'net.clientCertificate.password': string;
}

const loadClientCertificate = async (settings: LoadClientCertificateSettings) => {
	const parentDirectory = settings['net.clientCertificate'];
	let options: SetClientCertificateOptions|null = null;
	try {
		if (!parentDirectory) {
			options = null;
		} else if (!await shim.fsDriver().isDirectory(parentDirectory)) {
			throw new Error(`Failed to load client certificate. ${parentDirectory} is not a directory.`);
		} else {
			const certPath = join(parentDirectory, 'client-cert.pem');
			const keyPath = join(parentDirectory, 'client-key.pem');
			const domainsPath = join(parentDirectory, 'domains.regex');

			const keyPassword = settings['net.clientCertificate.password'];

			const domainsExp = await (async () => {
				if (!await shim.fsDriver().exists(domainsPath)) return /^.*$/;
				const text = await shim.fsDriver().readFile(domainsPath, 'utf-8');
				return new RegExp(text.trim());
			})();

			logger.info('Loading client certificate from', parentDirectory);
			options = { certPath, keyPath, domains: domainsExp, keyPassword };
		}

		await shim.setClientCertificate(options);
	} catch (error) {
		await shim.setClientCertificate(null);
		throw error;
	}
};

export default loadClientCertificate;

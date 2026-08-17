import { join } from 'path';
import shim, { SetClientCertificateOptions } from '../../shim';
import Logger from '@joplin/utils/Logger';
import { stripBom } from '../../string-utils';
import Setting from '../../models/Setting';

const logger = Logger.create('loadClientCertificate');

export interface LoadClientCertificateSettings {
	'net.clientCertificate'?: string;
	'net.clientCertificate.password'?: string;
}

const clientCertificateSettings = () => ({
	'net.clientCertificate': Setting.value('net.clientCertificate'),
	'net.clientCertificate.password': Setting.value('net.clientCertificate.password'),
});

const parseDomainsList = (text: string) => {
	const lines = stripBom(text).replace(/\r\n/g, '\n').trim();

	return lines
		.split('\n')
		.filter(entry => !!entry.trim() && !entry.startsWith('#'));
};

const assertFilesExist = async (paths: string[]) => {
	for (const path of paths) {
		if (!await shim.fsDriver().exists(path)) {
			throw new Error(`Reading client certificate: Missing required file: ${path}`);
		}
	}
};

const loadClientCertificate = async (settings: LoadClientCertificateSettings) => {
	settings = {
		...clientCertificateSettings(),
		...settings,
	};

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
			const domainsPath = join(parentDirectory, 'domains.txt');

			await assertFilesExist([certPath, keyPath, domainsPath]);

			const keyPassword = settings['net.clientCertificate.password'];
			const domainsList = parseDomainsList(await shim.fsDriver().readFile(domainsPath, 'utf-8'));

			logger.info('Loading client certificate from', parentDirectory);
			options = { certPath, keyPath, domains: domainsList, keyPassword };
		}

		await shim.setClientCertificate(options);
	} catch (error) {
		await shim.setClientCertificate(null);
		throw error;
	}
};

export default loadClientCertificate;

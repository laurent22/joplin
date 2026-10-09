import { Platform, NativeModules } from 'react-native';

export default async function setIgnoreTlsErrors(ignore: boolean): Promise<boolean> {
	if (Platform.OS === 'android') {
		return await NativeModules.SslModule.setIgnoreTlsErrors(ignore);
	} else {
		return false;
	}
}

// Client certificates (mutual TLS) are picked from the Android KeyChain, so this is Android only
export const clientCertificatesSupported = () => Platform.OS === 'android';

// The host and port are only used by the system dialog to tell the user which
// server is asking for a certificate, so a URL that can't be parsed is not an error.
export const hostAndPortFromUrl = (url: string): { host: string|null; port: number } => {
	const match = (url || '').trim().match(/^(https?):\/\/(?:[^@/?#]*@)?(\[[^\]]+\]|[^:/?#]+)(?::(\d+))?/i);
	if (!match) return { host: null, port: -1 };
	const defaultPort = match[1].toLowerCase() === 'https' ? 443 : 80;
	return { host: match[2], port: match[3] ? Number(match[3]) : defaultPort };
};

// Shows the system certificate picker. Resolves with the selected alias, or null if
// the user cancelled, in which case the previous selection is kept.
export async function selectClientCertificate(serverUrl: string): Promise<string|null> {
	if (!clientCertificatesSupported()) return null;
	const { host, port } = hostAndPortFromUrl(serverUrl);
	return await NativeModules.SslModule.selectClientCertificate(host, port);
}

export async function getClientCertificateAlias(): Promise<string|null> {
	if (!clientCertificatesSupported()) return null;
	return await NativeModules.SslModule.getClientCertificateAlias();
}

export async function clearClientCertificate(): Promise<void> {
	if (!clientCertificatesSupported()) return;
	await NativeModules.SslModule.clearClientCertificate();
}

import shim from './shim';

export async function ip() {
	const response = await shim.fetch('https://api.ipify.org/?format=json');
	if (!response.ok) {
		throw new Error(`Could not retrieve IP: ${await response.text()}`);
	}

	const ip = await response.json();
	return ip.ip;
}

export async function findAvailablePort(tcpPortUsed: any, possiblePorts: number[], extraRandomPortsToTry = 20) {
	for (let i = 0; i < extraRandomPortsToTry; i++) {
		possiblePorts.push(Math.floor(8000 + Math.random() * 2000));
	}

	let port = null;
	for (let i = 0; i < possiblePorts.length; i++) {
		const inUse = await tcpPortUsed.check(possiblePorts[i]);
		if (!inUse) {
			port = possiblePorts[i];
			break;
		}
	}
	return port;
}

export function mimeTypeFromHeaders(headers: Record<string, any>) {
	if (!headers || !headers['content-type']) return null;

	const splitted = headers['content-type'].split(';');
	return splitted[0].trim().toLowerCase();
}


const httpStatusCodes_: Record<number, string> = {
	100: 'Continue',
	101: 'Switching Protocols',
	102: 'Processing',
	103: 'Early Hints',
	200: 'OK',
	201: 'Created',
	202: 'Accepted',
	203: 'Non-Authoritative Information',
	204: 'No Content',
	205: 'Reset Content',
	206: 'Partial Content',
	207: 'Multi-Status',
	208: 'Already Reported',
	226: 'IM Used',
	300: 'Multiple Choices',
	301: 'Moved Permanently',
	302: 'Found',
	303: 'See Other',
	304: 'Not Modified',
	305: 'Use Proxy',
	307: 'Temporary Redirect',
	308: 'Permanent Redirect',
	400: 'Bad Request',
	401: 'Unauthorized',
	402: 'Payment Required',
	403: 'Forbidden',
	404: 'Not Found',
	405: 'Method Not Allowed',
	406: 'Not Acceptable',
	407: 'Proxy Authentication Required',
	408: 'Request Timeout',
	409: 'Conflict',
	410: 'Gone',
	411: 'Length Required',
	412: 'Precondition Failed',
	413: 'Payload Too Large',
	414: 'URI Too Long',
	415: 'Unsupported Media Type',
	416: 'Range Not Satisfiable',
	417: 'Expectation Failed',
	418: 'I\'m a Teapot',
	421: 'Misdirected Request',
	422: 'Unprocessable Entity',
	423: 'Locked',
	424: 'Failed Dependency',
	425: 'Too Early',
	426: 'Upgrade Required',
	428: 'Precondition Required',
	429: 'Too Many Requests',
	431: 'Request Header Fields Too Large',
	451: 'Unavailable For Legal Reasons',
	500: 'Internal Server Error',
	501: 'Not Implemented',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Gateway Timeout',
	505: 'HTTP Version Not Supported',
	506: 'Variant Also Negotiates',
	507: 'Insufficient Storage',
	508: 'Loop Detected',
	509: 'Bandwidth Limit Exceeded',
	510: 'Not Extended',
	511: 'Network Authentication Required',
};

export function getHttpStatusMessage(statusCode: number): string {
	const msg = httpStatusCodes_[statusCode];

	// We don't throw an exception since a server can send any arbitrary error code
	if (!msg) return 'Unknown status code';

	return msg;
}

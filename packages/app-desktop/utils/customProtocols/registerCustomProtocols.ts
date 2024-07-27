
import { protocol } from 'electron';
import { contentProtocolName } from './constants';

// This must be called before Electron's onReady event.
// handleCustomProtocols should be called separately, after onReady.
const registerCustomProtocols = async () => {
	const protocolPrivileges = {
		supportFetchAPI: true,

		// Don't trigger mixed content warnings (see https://stackoverflow.com/a/75988466)
		secure: true,

		// Allows loading localStorage/sessionStorage and similar APIs
		standard: true,

		// Allows loading <video>/<audio> streaming elements
		stream: true,

		corsEnabled: true,
		codeCache: true,
	};
	protocol.registerSchemesAsPrivileged([
		{ scheme: contentProtocolName, privileges: protocolPrivileges },
	]);
};

export default registerCustomProtocols;

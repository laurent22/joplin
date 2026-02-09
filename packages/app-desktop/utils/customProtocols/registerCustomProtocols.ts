
import { protocol } from 'electron';
import { contentProtocolName, pluginProtocolName } from './constants';

// This must be called before Electron's onReady event.
// handleCustomProtocols should be called separately, after onReady.
const registerCustomProtocols = async () => {
	const contentProtocolPrivileges = {
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
	// The plugin protocol is currently only used for serving JS and doesn't require as
	// broad privileges.
	const pluginProtocolPrivileges = {
		secure: true,
		standard: true,
		// Support the fetch API to fix "fetch failed" errors for source map requests.
		// (Note: Currently all source map requests will return 404)
		supportFetchApi: true,
	};
	protocol.registerSchemesAsPrivileged([
		{ scheme: contentProtocolName, privileges: contentProtocolPrivileges },
		{ scheme: pluginProtocolName, privileges: pluginProtocolPrivileges },
	]);
};

export default registerCustomProtocols;

// Just a convenient wrapper to get a typed bridge in TypeScript


import electron_remote_getGlobal from '@electron/remote';
import type { Bridge } from '../bridge';
const remoteBridge = electron_remote_getGlobal.getGlobal('joplinBridge');

export default function bridge(): Bridge {
	return remoteBridge;
}

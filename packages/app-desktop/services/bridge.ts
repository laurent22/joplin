// Just a convenient wrapper to get a typed bridge in TypeScript

import type { Bridge } from '../bridge';

const remoteBridge = require('@electron/remote').getGlobal('joplinBridge');

export default function bridge(): Bridge {
	return remoteBridge;
}

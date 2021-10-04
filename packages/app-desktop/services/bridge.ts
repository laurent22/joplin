// Just a convenient wrapper to get a typed bridge in TypeScript

import { Bridge } from '../bridge';

const remoteBridge = require('@electron/remote').require('./bridge').default;

export default function bridge(): Bridge {
	return remoteBridge();
}

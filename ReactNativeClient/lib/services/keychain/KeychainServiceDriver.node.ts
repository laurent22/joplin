import KeychainServiceDriverBase from './KeychainServiceDriverBase';
const { shim } = require('lib/shim.js');

// keytar throws an error when system keychain is not present;
// even when keytar itself is installed.
// try/catch to ensure system keychain is present and no error is thrown.

// For now, keychain support is disabled on Linux because when keytar is loaded
// it seems to cause the following error when loading Sharp:
//
// Something went wrong installing the "sharp" module
// /lib/x86_64-linux-gnu/libz.so.1: version `ZLIB_1.2.9' not found (required by /home/travis/build/laurent22/joplin/CliClient/node_modules/sharp/build/Release/../../vendor/lib/libpng16.so.16)
//
// See: https://travis-ci.org/github/laurent22/joplin/jobs/686222036
//
// Also disabled in portable mode obviously.

let keytar:any;
try {
	keytar = shim.isLinux() || shim.isPortable() ? null : require('keytar');
} catch (error) {
	console.error('Cannot load keytar - keychain support will be disabled', error);
	keytar = null;
}

export default class KeychainServiceDriver extends KeychainServiceDriverBase {

	async setPassword(name:string, password:string):Promise<boolean> {
		if (!keytar) return false;
		await keytar.setPassword(`${this.appId}.${name}`, `${this.clientId}@joplin`, password);
		return true;
	}

	async password(name:string):Promise<string> {
		if (!keytar) return null;
		return keytar.getPassword(`${this.appId}.${name}`, `${this.clientId}@joplin`);
	}

	async deletePassword(name:string):Promise<void> {
		if (!keytar) return;
		await keytar.deletePassword(`${this.appId}.${name}`, `${this.clientId}@joplin`);
	}

}

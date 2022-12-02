const BaseSyncTarget = require('./BaseSyncTarget').default;
const { _ } = require('./locale');
const Setting = require('./models/Setting').default;
const Synchronizer = require('./Synchronizer').default;
const SyncTargetWebDAV = require('./SyncTargetWebDAV');
const { Issuer, generators } = require('openid-client');
const { findAvailablePort } = require('./net-utils');
const http = require('http');
const urlParser = require('url');
const enableServerDestroy = require('server-destroy');

class SyncTargetOcis extends BaseSyncTarget {

	client = null;
	port = null;
	oauthServer = null;
	authorizationUrl = null;

	static id() {
		return 11;
	}

	static supportsConfigCheck() {
		return true;
	}

	static targetName() {
		return 'ocis';
	}

	static label() {
		return _('Ocis');
	}

	static description() {
		return 'Owncloud OCIS';
	}

	static async getAuth() {
		let auth = Setting.value(`sync.${SyncTargetOcis.id()}.auth`);
		if (auth) {
			try {
				auth = JSON.parse(auth);
			} catch (error) {
				auth = null;
			}
		}
		return auth;
	}
	async isAuthenticated() {
		return true;
	}

	static async checkConfig() {
		Setting.setValue(`sync.${SyncTargetOcis.id()}.auth`,null);
		await SyncTargetOcis.openIdConnectDance();

		let auth;

		while (auth === undefined || auth.access_token === undefined) {
			await new Promise(resolve => setTimeout(resolve, 1000));
			auth = await SyncTargetOcis.getAuth();
		}

		const url = Setting.value('sync.11.url');
		const ocisIssuer = await Issuer.discover(url);
		const client = new ocisIssuer.Client({
			client_id: 'xdXOt13JKxym1B1QcEncf2XDkLAexMBFwiT9j6EfhhHFJhs2KM9jbjTmf8JBXE69',
			client_secret: 'UBntmLjC2yYCeHwsyj73Uwo9TAaecAetRwMw0xYcvNL9yRdLSUi0hUAHfvCHFeFh',

		});
		let userinfo;
		try {
			userinfo = await client.userinfo(auth.access_token);
		} catch (e) {
			const tokenSet = await client.refresh(auth.refresh_token);
			Setting.setValue(`sync.${SyncTargetOcis.id()}.auth`, tokenSet ? JSON.stringify(tokenSet) : null);
		}
		userinfo = await client.userinfo(auth.access_token);
		if (userinfo.preferred_username === undefined) {
			return {
				ok: false,
				errorMessage: 'could not get userinfo',
			};
		}

		const options = {
			path: () => `${Setting.value('sync.11.url')}/remote.php/dav/files/${userinfo.preferred_username}/joplin/`,
			username: () => null,
			password: () => null,
			token: () => auth.access_token,
			ignoreTlsErrors: () => Setting.value('net.ignoreTlsErrors'),
		};
		return SyncTargetWebDAV.checkConfig(options);
	}

	async initFileApi() {
		const auth = await SyncTargetOcis.getAuth();
		if (auth.access_token === undefined) {
			throw new Error('no access token found');
		}
		const url = Setting.value('sync.11.url');
		const ocisIssuer = await Issuer.discover(url);
		const client = new ocisIssuer.Client({
			client_id: 'xdXOt13JKxym1B1QcEncf2XDkLAexMBFwiT9j6EfhhHFJhs2KM9jbjTmf8JBXE69',
			client_secret: 'UBntmLjC2yYCeHwsyj73Uwo9TAaecAetRwMw0xYcvNL9yRdLSUi0hUAHfvCHFeFh',

		});
		let userinfo;
		try {
			userinfo = await client.userinfo(auth.access_token);
		} catch (e) {
			const tokenSet = await client.refresh(auth.refresh_token);
			Setting.setValue(`sync.${SyncTargetOcis.id()}.auth`, tokenSet ? JSON.stringify(tokenSet) : null);
		}

		console.log('userinfo %j', userinfo);

		const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetOcis.id(), {
			path: () => `${Setting.value('sync.11.url')}/remote.php/dav/files/${userinfo.preferred_username}/joplin/`,
			username: () => null,
			password: () => null,
			token: () => auth.access_token,
			ignoreTlsErrors: () => Setting.value('net.ignoreTlsErrors'),
		});

		fileApi.setLogger(this.logger());

		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}

	static async openIdConnectDance() {
		const url = Setting.value('sync.11.url');
		const ocisIssuer = await Issuer.discover(url);
		console.log('Discovered issuer %s %O', ocisIssuer.issuer, ocisIssuer.metadata);


		const port = await findAvailablePort(require('tcp-port-used'), [9967, 8967, 8867], 0);
		if (!port) throw new Error(_('All potential ports are in use - please report the issue at %s', 'https://github.com/laurent22/joplin'));

		const client = new ocisIssuer.Client({
			client_id: 'xdXOt13JKxym1B1QcEncf2XDkLAexMBFwiT9j6EfhhHFJhs2KM9jbjTmf8JBXE69',
			client_secret: 'UBntmLjC2yYCeHwsyj73Uwo9TAaecAetRwMw0xYcvNL9yRdLSUi0hUAHfvCHFeFh',
			redirect_uris: [`http://localhost:${port}`],
			response_types: ['code'],
			id_token_signed_response_alg: 'PS256',
		}); // => Client

		console.log(client);

		const code_verifier = generators.codeVerifier();
		const code_challenge = generators.codeChallenge(code_verifier);
		const state = generators.state();
		const authorizationUrl = client.authorizationUrl({
			scope: 'openid offline_access email profile',
			code_challenge,
			code_challenge_method: 'S256',
			state,
		});
		console.log('authorizationUrl %s', authorizationUrl);
		await require('electron').shell.openExternal(authorizationUrl);

		let tokenSet;

		let oauthServer = http.createServer();


		oauthServer.on('request', async (request, response) => {
			const url = urlParser.parse(request.url, true);

			console.log('url %O', url);

			const params = client.callbackParams(request);
			tokenSet = await client.callback(`http://localhost:${port}`, params, { code_verifier, state });
			console.log('received and validated tokens %j', tokenSet);
			console.log('validated ID Token claims %j', tokenSet.claims());

			const writeResponse = (code, message) => {
				response.writeHead(code, { 'Content-Type': 'text/html' });
				response.write(SyncTargetOcis.makePage(message));
				response.end();
			};

			await writeResponse(200, _('The application has been authorised - you may now close this browser tab.'));
			oauthServer.destroy();
			oauthServer = null;
			Setting.setValue(`sync.${SyncTargetOcis.id()}.auth`, tokenSet ? JSON.stringify(tokenSet) : null);

			const userinfo = await client.userinfo(tokenSet.access_token);
			console.log('userinfo %j', userinfo);
		});


		oauthServer.listen(port);
		enableServerDestroy(oauthServer);
	}
	static makePage(message) {
		const header = `
		<!doctype html>
		<html><head><meta charset="utf-8"></head><body>`;

		const footer = `
		</body></html>
		`;

		return header + message + footer;
	}
}

module.exports = SyncTargetOcis;

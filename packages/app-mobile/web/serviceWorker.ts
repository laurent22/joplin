/* eslint-disable no-console */

// This is a type-only import that gives access to ServiceWorker types.
// For this to work with Webpack, an import alias for 'serviceworker' may
// also be present in webpack.config.js.
import 'serviceworker';

// From https://github.com/gzuidhof/coi-serviceworker. This script enables the necessary
// headers on GitHub pages to allow the use of SQLite. It has been modified and refactored
// to add support for using the app while offline.
//
// eslint-disable-next-line multiline-comment-style -- Preserve license
/* !
 * @license
 *
 * Based on coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT
 *
 * MIT License
 *
 * Copyright (c) 2021 Guido Zuidhof
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

let coepCredentialless = false;
if (typeof window === 'undefined') {
	self.addEventListener('install', () => self.skipWaiting());
	self.addEventListener('activate', (event: ExtendableEvent) => event.waitUntil(self.clients.claim()));

	const serviceWorkerPath = new URL(self.location.href ?? '').pathname;
	const mainPageBasePath = serviceWorkerPath.replace(/\/[^/]+$/, '/');
	const waitingForClientPath = `${mainPageBasePath}just-one-client.html`;
	const mainPagePaths = [mainPageBasePath, `${mainPageBasePath}index.html`];

	const isJoplinWebClientPage = (client: WindowClient) => {
		const clientUrl = new URL(client.url);
		return mainPagePaths.includes(clientUrl.pathname);
	};

	self.addEventListener('message', async (ev) => {
		if (!ev.data) {
			return;
		} else if (ev.data.type === 'deregister') {
			await self.registration.unregister();

			const clients = await self.clients.matchAll();
			for (const client of clients) {
				if (client instanceof WindowClient) {
					void client.navigate(client.url);
				}
			}
		} else if (ev.data.type === 'coepCredentialless') {
			coepCredentialless = ev.data.value;
		} else if (ev.data.type === 'closeAllJoplinWebTabs') {
			for (const client of await self.clients.matchAll()) {
				if (client instanceof WindowClient && isJoplinWebClientPage(client)) {
					void client.navigate(`${mainPageBasePath}closed.html`);
				}
			}
		}
	});

	self.addEventListener('fetch', (event: FetchEvent) => {
		const originalRequest = event.request;
		const needsExtraHeaders = originalRequest.cache !== 'only-if-cached' || originalRequest.mode === 'same-origin';

		const request = (coepCredentialless && originalRequest.mode === 'no-cors' && !needsExtraHeaders)
			? new Request(originalRequest, {
				credentials: 'omit',
			})
			: originalRequest;

		// Joplin modification: Redirect users to prevent multiple clients from being open at the same time.
		const handleRedirects = async (event: FetchEvent) => {
			const targetUrl = new URL(request.url);

			const redirectable = [...mainPagePaths, waitingForClientPath].includes(targetUrl.pathname) && self.location.origin === targetUrl.origin;
			if (redirectable) {
				const allClients = await self.clients.matchAll({ includeUncontrolled: true });

				let hasLockingClient = false;
				for (const client of allClients) {
					if (!(client instanceof WindowClient)) continue;

					const clientUrl = new URL(client.url);
					const isRefresh = event.clientId === client.id || event.resultingClientId === client.id;
					if (mainPagePaths.includes(clientUrl.pathname) && !isRefresh) {
						hasLockingClient = true;
					}
				}

				let redirectUrl = null;
				if (targetUrl.pathname === waitingForClientPath && !hasLockingClient) {
					redirectUrl = `${self.location.origin}${mainPageBasePath}`;
				} else if (targetUrl.pathname !== waitingForClientPath && hasLockingClient) {
					redirectUrl = `${self.location.origin}${waitingForClientPath}`;
				}

				if (redirectUrl) {
					return new Response(`Redirecting to ${redirectUrl}...`, { status: 302, headers: new Headers({ 'Location': redirectUrl }) }); // 302 = Found
				}
			}
			return null;
		};

		const withExtraResponseHeaders = (response: Response) => {
			if (response.status !== 0 && needsExtraHeaders) {
				const newHeaders = new Headers(response.headers);
				newHeaders.set('Cross-Origin-Embedder-Policy',
					coepCredentialless ? 'credentialless' : 'require-corp',
				);
				if (!coepCredentialless) {
					newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
				}
				newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

				response = new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers: newHeaders,
				});
			}
			return response;
		};

		const cacheResponse = (cache: Cache, response: Response, requestUrl: URL) => {
			try {
				if (
					request.method === 'GET' &&
					response.ok &&
					requestUrl.origin === self.location.origin &&
					(
						requestUrl.pathname.match(/\.(js|css|wasm|json|ttf|html|png)$/) ||
						// Also cache HTML responses (e.g. for index.html, when requested with a directory
						// URL).
						(response.headers?.get('Content-Type') ?? '').startsWith('text/html')
					)
				) {
					console.log('Service worker: cached', event.request.url);
					void cache.put(request, response.clone());
				}
			} catch (error) {
				console.warn('Failed to save ', event.request?.url, 'to the cache. Error: ', error);
			}
		};

		event.respondWith((async () => {
			const redirectResponse = await handleRedirects(event);
			if (redirectResponse) {
				return redirectResponse;
			}

			const requestUrl = new URL(event.request.url);
			const cache = await caches.open('v1');
			try {
				const response = withExtraResponseHeaders(await fetch(request));

				// Joplin modification: Store the response in the cache to support offline mode
				cacheResponse(cache, response, requestUrl);

				if (requestUrl.origin === self.location.origin && !response.ok) {
					console.warn('Response to request for a main page path', requestUrl, 'was not OK. Responding from the cache.');

					const cachedResponse = await cache.match(request);
					if (cachedResponse) {
						return cachedResponse;
					}
				}

				return response;
			} catch (error) {
				console.error('ERROR requesting', event.request.url, ':', error);
				// Joplin modification: Restore from the cache to support offline mode.
				return cache.match(request);
			}
		})());
	});

} else {
	void (async () => {
		const reloadedBySelf = window.sessionStorage.getItem('coiReloadedBySelf');
		window.sessionStorage.removeItem('coiReloadedBySelf');
		const coepDegrading = reloadedBySelf === 'coepDegrade';

		// You can customize the behavior of this script through a global `coi` variable.
		const coi = {
			shouldRegister: () => !reloadedBySelf,
			shouldDeregister: () => false,
			coepCredentialless: () => true,
			coepDegrade: () => true,
			doReload: () => window.location.reload(),
			quiet: false,
		};

		const consoleLog = (...args: unknown[]) => {
			if (coi.quiet) return;
			console.log(...args);
		};

		const consoleError = (...args: unknown[]) => {
			if (coi.quiet) return;
			console.error(...args);
		};

		const n = navigator;
		const controlling = n.serviceWorker && n.serviceWorker.controller;

		// Record the failure if the page is served by serviceWorker.
		if (controlling && !window.crossOriginIsolated) {
			window.sessionStorage.setItem('coiCoepHasFailed', 'true');
		}
		const coepHasFailed = window.sessionStorage.getItem('coiCoepHasFailed');

		if (controlling) {
			// Reload only on the first failure.
			const reloadToDegrade = coi.coepDegrade() && !(
				coepDegrading || window.crossOriginIsolated
			);
			n.serviceWorker.controller.postMessage({
				type: 'coepCredentialless',
				value: (reloadToDegrade || coepHasFailed && coi.coepDegrade())
					? false
					: coi.coepCredentialless(),
			});
			if (reloadToDegrade) {
				consoleLog('Reloading page to degrade COEP.');
				window.sessionStorage.setItem('coiReloadedBySelf', 'coepDegrade');
				coi.doReload();
			}

			if (coi.shouldDeregister()) {
				n.serviceWorker.controller.postMessage({ type: 'deregister' });
			}
		}

		// If we're already coi: do nothing. Perhaps it's due to this script doing its job, or COOP/COEP are
		// already set from the origin server. Also if the browser has no notion of crossOriginIsolated, just give up here.
		//
		// Joplin modification: Always register the service worker.
		// if (window.crossOriginIsolated !== false || !coi.shouldRegister()) return;

		if (!window.isSecureContext) {
			consoleLog('COOP/COEP Service Worker not registered, a secure context is required.');
			return;
		}

		// In some environments (e.g. Firefox private mode) this won't be available
		if (!n.serviceWorker) {
			consoleError('COOP/COEP Service Worker not registered, perhaps due to private mode.');
			return;
		}

		const registration = await n.serviceWorker.register(window.document.currentScript.getAttribute('src'));
		consoleLog('COOP/COEP Service Worker registered', registration.scope);

		registration.addEventListener('updatefound', () => {
			consoleLog('Reloading page to make use of updated COOP/COEP Service Worker.');
			window.sessionStorage.setItem('coiReloadedBySelf', 'updatefound');
			coi.doReload();
		});

		// If the registration is active, but it's not controlling the page
		if (registration.active && !n.serviceWorker.controller) {
			consoleLog('Reloading page to make use of COOP/COEP Service Worker.');
			window.sessionStorage.setItem('coiReloadedBySelf', 'notControlling');
			coi.doReload();
		}
	})();
}

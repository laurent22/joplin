'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_1 = require('react');
const useSyncTargetUpgrade_1 = require('lib/services/synchronizer/gui/useSyncTargetUpgrade');
const { render } = require('react-dom');
const ipcRenderer = require('electron').ipcRenderer;
const Setting = require('lib/models/Setting');
const { bridge } = require('electron').remote.require('./bridge');
function useAppCloseHandler(upgradeResult) {
	react_1.useEffect(function() {
		function onAppClose() {
			return __awaiter(this, void 0, void 0, function* () {
				let canClose = true;
				if (!upgradeResult.done) {
					canClose = confirm('The synchronisation target upgrade is still running and it is recommanded to let it finish. Close the application anyway?');
				}
				if (canClose) {
					// We set the state back to IDLE so that the app can start normally and
					// potentially the user can fix issues if any, export the data, etc.
					// The message to upgrade will show up again if they try to sync.
					Setting.setValue('sync.upgradeState', Setting.SYNC_UPGRADE_STATE_IDLE);
					yield Setting.saveAll();
				}
				ipcRenderer.send('asynchronous-message', 'appCloseReply', {
					canClose: canClose,
				});
			});
		}
		ipcRenderer.on('appClose', onAppClose);
		return () => {
			ipcRenderer.off('appClose', onAppClose);
		};
	}, [upgradeResult.done]);
}
function useStyle() {
	react_1.useEffect(function() {
		const element = document.createElement('style');
		element.appendChild(document.createTextNode(`
			body {
				font-family: sans-serif;
				padding: 5px 20px;
				color: #333333;
			}

			.errorBox {
				border: 1px solid red;
				padding: 5px 20px;
				background-color: #ffeeee;
			}

			pre {
				overflow-x: scroll;
			}
		`));
		document.head.appendChild(element);
	}, []);
}
function useRestartOnDone(upgradeResult) {
	react_1.useEffect(function() {
		if (upgradeResult.done) {
			bridge().restart();
		}
	}, [upgradeResult.done]);
}
function Root_UpgradeSyncTarget() {
	const upgradeResult = useSyncTargetUpgrade_1.default();
	useStyle();
	useRestartOnDone(upgradeResult);
	useAppCloseHandler(upgradeResult);
	function renderUpgradeError() {
		if (!upgradeResult.error) { return null; }
		return (React.createElement('div', { className: 'errorBox' },
			React.createElement('h2', null, 'Error'),
			React.createElement('p', null,
				'The sync target could not be upgraded due to an error. For support, please copy the ',
				React.createElement('em', null, 'complete'),
				' content of this page and paste it in the forum: https://discourse.joplinapp.org/'),
			React.createElement('p', null, 'The full error was:'),
			React.createElement('p', null, upgradeResult.error.message),
			React.createElement('pre', null, upgradeResult.error.stack)));
	}
	return (React.createElement('div', null,
		React.createElement('h2', null, 'Joplin upgrade in progress...'),
		React.createElement('p', null, 'Please wait while the sync target is being upgraded. It may take a few seconds or a few minutes depending on the upgrade. The application will automatically restart once it is completed.'),
		renderUpgradeError()));
}
render(React.createElement(Root_UpgradeSyncTarget, null), document.getElementById('react-root'));
// # sourceMappingURL=Root_UpgradeSyncTarget.js.map

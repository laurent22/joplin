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
const react_1 = require('react');
const resourceHandling_1 = require('./resourceHandling');
const ResourceFetcher = require('lib/services/ResourceFetcher.js');
const DecryptionWorker = require('lib/services/DecryptionWorker.js');
const Note = require('lib/models/Note');
function useResourceInfos(dependencies) {
	const { noteBody } = dependencies;
	const [resourceInfos, setResourceInfos] = react_1.useState({});
	function installResourceHandling(refreshResourceHandler) {
		ResourceFetcher.instance().on('downloadComplete', refreshResourceHandler);
		ResourceFetcher.instance().on('downloadStarted', refreshResourceHandler);
		DecryptionWorker.instance().on('resourceDecrypted', refreshResourceHandler);
	}
	function uninstallResourceHandling(refreshResourceHandler) {
		ResourceFetcher.instance().off('downloadComplete', refreshResourceHandler);
		ResourceFetcher.instance().off('downloadStarted', refreshResourceHandler);
		DecryptionWorker.instance().off('resourceDecrypted', refreshResourceHandler);
	}
	const refreshResource = react_1.useCallback(function(event) {
		return __awaiter(this, void 0, void 0, function* () {
			const resourceIds = yield Note.linkedResourceIds(noteBody);
			if (resourceIds.indexOf(event.id) >= 0) {
				resourceHandling_1.clearResourceCache();
				setResourceInfos(yield resourceHandling_1.attachedResources(noteBody));
			}
		});
	}, [noteBody]);
	react_1.useEffect(() => {
		installResourceHandling(refreshResource);
		return () => {
			uninstallResourceHandling(refreshResource);
		};
	}, [refreshResource]);
	return { resourceInfos };
}
exports.default = useResourceInfos;
// # sourceMappingURL=useResourceRefresher.js.map

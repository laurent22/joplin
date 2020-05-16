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
const Note = require('lib/models/Note.js');
const checkPermissions = require('lib/permissions.js').default;
const { ToastAndroid } = require('react-native');
const ShareExtension = require('lib/share.js').default;
const { PermissionsAndroid } = require('react-native');
exports.default = (sharedData, folderId, dispatch) => __awaiter(void 0, void 0, void 0, function* () {
	if (!!sharedData.resources && sharedData.resources.length > 0) {
		const hasPermissions = yield checkPermissions(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
		if (!hasPermissions) {
			ToastAndroid.show('Cannot receive shared data - permission denied', ToastAndroid.SHORT);
			ShareExtension.close();
			return;
		}
	}
	// This is a bit hacky, but the surest way to go to
	// the needed note. We go back one screen in case there's
	// already a note open - if we don't do this, the dispatch
	// below will do nothing (because routeName wouldn't change)
	// Then we wait a bit for the state to be set correctly, and
	// finally we go to the new note.
	yield dispatch({ type: 'NAV_BACK' });
	yield dispatch({ type: 'SIDE_MENU_CLOSE' });
	const newNote = yield Note.save({
		parent_id: folderId,
	}, { provisional: true });
	setTimeout(() => {
		dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: newNote.id,
			sharedData: sharedData,
		});
	}, 5);
});
// # sourceMappingURL=share-handler.js.map

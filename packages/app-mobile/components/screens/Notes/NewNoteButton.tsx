import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import CommandService from '@joplin/lib/services/CommandService';
import FloatingActionButton from '../../buttons/FloatingActionButton';
import { AccessibilityActionEvent, AccessibilityActionInfo } from 'react-native';
import { AttachFileAction } from '../Note/commands/attachFile';
import { useCallback, useMemo } from 'react';
import Logger from '@joplin/utils/Logger';
import NavService from '@joplin/lib/services/NavService';
import { MenuOption } from '../../BottomDrawerMenu';

const logger = Logger.create('NewNoteButton');

interface Props {
}

const makeNewNote = (isTodo: boolean, action?: AttachFileAction) => {
	logger.debug(`New ${isTodo ? 'to-do' : 'note'} with action`, action);
	const body = '';
	return CommandService.instance().execute('newNote', body, isTodo, { attachFileAction: action });
};

const NewNoteButton: React.FC<Props> = () => {

	const menuContent = useMemo(() => {
		const menuItem = (icon: string, title: string, action: ()=> void) => {
			return {
				icon,
				title,
				onPress: action,
			};
		};
		const attachmentMenuItem = (icon: string, title: string, action: AttachFileAction, attachmentLabel: string|null = null) => {
			return {
				...menuItem(icon, title, () => makeNewNote(false, action)),
				accessibilityHint: _('Creates a new note with an attachment of type %s', attachmentLabel ?? title),
			};
		};

		const items: MenuOption[] = [
			attachmentMenuItem('material camera-outline', _('Camera'), AttachFileAction.TakePhoto),
			attachmentMenuItem('material attachment', _('Attachment'), AttachFileAction.AttachFile, _('File')),
			{ icon: 'material data-matrix-scan', title: _('Scan notebook'), onPress: () => NavService.go('DocumentScanner') },
			attachmentMenuItem('material draw', _('Drawing'), AttachFileAction.AttachDrawing),
			attachmentMenuItem('material microphone-outline', _('Recording'), AttachFileAction.RecordAudio),
			{ isDivider: true },
			{ icon: 'material file-document-check-outline', title: _('New to-do'), onPress: () => makeNewNote(true), autoFocus: true },
			{ icon: 'material file-document-outline', title: _('New note'), onPress: () => makeNewNote(false) },
		];
		return items;
	}, []);

	// Android and iOS: Accessibility actions simplify creating new notes and to-dos. These
	// are extra important because the "note with attachment" items are annoyingly first in
	// the focus order (and it doesn't seem possible to change this without adding a new
	// dependency).
	const accessibilityActions = useMemo((): AccessibilityActionInfo[] => {
		return [{
			name: 'new-note',
			label: _('New note'),
		}, {
			name: 'new-to-do',
			label: _('New to-do'),
		}];
	}, []);
	const onAccessibilityAction = useCallback((event: AccessibilityActionEvent) => {
		if (event.nativeEvent.actionName === 'new-note') {
			return makeNewNote(false);
		} else if (event.nativeEvent.actionName === 'new-to-do') {
			return makeNewNote(true);
		}
		return Promise.resolve();
	}, []);

	return <FloatingActionButton
		mainButton={{
			icon: 'add',
			label: _('Add new'),
		}}
		menuContent={menuContent}
		accessibilityActions={accessibilityActions}
		onAccessibilityAction={onAccessibilityAction}
	/>;
};

export default NewNoteButton;

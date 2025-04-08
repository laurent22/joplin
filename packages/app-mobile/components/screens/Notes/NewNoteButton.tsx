import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import CommandService from '@joplin/lib/services/CommandService';
import { Divider } from 'react-native-paper';
import FloatingActionButton from '../../buttons/FloatingActionButton';
import { AccessibilityActionEvent, AccessibilityActionInfo, StyleSheet, View } from 'react-native';
import { AttachFileAction } from '../Note/commands/attachFile';
import LabelledIconButton from '../../buttons/LabelledIconButton';
import TextButton, { ButtonSize, ButtonType } from '../../buttons/TextButton';
import { useCallback, useMemo, useRef } from 'react';
import Logger from '@joplin/utils/Logger';
import focusView from '../../../utils/focusView';

const logger = Logger.create('NewNoteButton');

interface Props {

}

const makeNewNote = (isTodo: boolean, action?: AttachFileAction) => {
	logger.debug(`New ${isTodo ? 'to-do' : 'note'} with action`, action);
	const body = '';
	return CommandService.instance().execute('newNote', body, isTodo, { attachFileAction: action });
};

const styles = StyleSheet.create({
	buttonRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 2,
	},
	mainButtonRow: {
		flexWrap: 'nowrap',
	},
	spacer: {
		flexShrink: 1,
		flexGrow: 0,
		width: 12,
	},
	shortcutButton: {
		flexGrow: 1,
	},
	mainButton: {
		flexShrink: 1,
	},
	mainButtonLabel: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	menuContent: {
		gap: 12,
		flexShrink: 1,
		flexDirection: 'column',
	},
});

const NewNoteButton: React.FC<Props> = _props => {
	const newNoteRef = useRef<View|null>(null);

	const renderShortcutButton = (action: AttachFileAction, icon: string, title: string) => {
		return <LabelledIconButton
			onPress={() => makeNewNote(false, action)}
			style={styles.shortcutButton}
			title={title}
			accessibilityHint={_('Creates a new note with an attachment of type %s', title)}
			icon={icon}
		/>;
	};

	const menuContent = <View style={styles.menuContent}>
		<View style={styles.buttonRow}>
			{renderShortcutButton(AttachFileAction.AttachFile, 'material attachment', _('Attachment'))}
			{renderShortcutButton(AttachFileAction.RecordAudio, 'material microphone', _('Recording'))}
			{renderShortcutButton(AttachFileAction.TakePhoto, 'material camera', _('Camera'))}
			{renderShortcutButton(AttachFileAction.AttachDrawing, 'material draw', _('Drawing'))}
		</View>
		<Divider/>
		<View style={[styles.buttonRow, styles.mainButtonRow]}>
			<TextButton
				icon='checkbox-outline'
				style={styles.mainButton}
				onPress={() => {
					void makeNewNote(true);
				}}
				type={ButtonType.Secondary}
				size={ButtonSize.Larger}
			>{_('New to-do')}</TextButton>
			<View style={styles.spacer}/>
			<TextButton
				touchableRef={newNoteRef}
				icon='file-document-outline'
				style={styles.mainButton}
				onPress={() => {
					void makeNewNote(false);
				}}
				type={ButtonType.Primary}
				size={ButtonSize.Larger}
			>{_('New note')}</TextButton>
		</View>
	</View>;

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
	const onMenuShown = useCallback(() => {
		// Note: May apply only to web:
		focusView('NewNoteButton', newNoteRef.current);
	}, []);

	return <FloatingActionButton
		mainButton={{
			icon: 'add',
			label: _('Add new'),
		}}
		menuContent={menuContent}
		onMenuShow={onMenuShown}
		accessibilityActions={accessibilityActions}
		onAccessibilityAction={onAccessibilityAction}
	/>;
};

export default NewNoteButton;

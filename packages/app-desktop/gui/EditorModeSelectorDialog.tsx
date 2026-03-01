import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import Dialog from '@joplin/lib/components/Dialog';
import DialogButtonRow, { ClickEvent } from './DialogButtonRow';
import DialogTitle from './DialogTitle';
import EditorModeSelector, { EditorMode } from './EditorModeSelector';

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
}

export const editorCodeViewFromMode = (mode: EditorMode) => {
	return mode === 'markdown';
};

export const commitEditorModeSelection = (
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function,
	mode: EditorMode,
) => {
	const editorCodeView = editorCodeViewFromMode(mode);
	Setting.setValue('editor.codeView', editorCodeView);
	Setting.setValue('editor.modeSelectorShown', true);

	dispatch({ type: 'EDITOR_CODE_VIEW_CHANGE', value: editorCodeView });
	dispatch({ type: 'DIALOG_CLOSE', name: 'editorModeSelector' });
};

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export const dismissEditorModeSelection = (dispatch: Function) => {
	Setting.setValue('editor.modeSelectorShown', true);
	dispatch({ type: 'DIALOG_CLOSE', name: 'editorModeSelector' });
};

export default function EditorModeSelectorDialog(props: Props) {
	const [selectedMode, setSelectedMode] = useState<EditorMode>('richText');
	const hasCommittedRef = useRef(false);
	const hasDismissedRef = useRef(false);

	const commit = useCallback(() => {
		if (hasCommittedRef.current) return;
		hasCommittedRef.current = true;
		commitEditorModeSelection(props.dispatch, selectedMode);
	}, [props.dispatch, selectedMode]);

	const onButtonRowClick = useCallback((event: ClickEvent) => {
		if (event.buttonName !== 'ok') return;
		commit();
	}, [commit]);

	const dismiss = useCallback(() => {
		if (hasCommittedRef.current || hasDismissedRef.current) return;
		hasDismissedRef.current = true;
		dismissEditorModeSelection(props.dispatch);
	}, [props.dispatch]);

	return (
		<Dialog
			onCancel={dismiss}
			className='editor-mode-selector-dialog'
			contentStyle={{
				width: 720,
				maxWidth: 'calc(100vw - 40px)',
				alignSelf: 'center',
				margin: 20,
				padding: 24,
			}}
		>
			<div className="dialog-root">
				<DialogTitle title={_('Select your preferred editor mode')} />
				<div className="dialog-content">
					<p>{_('You can switch this later from the toolbar or menu.')}</p>
					<EditorModeSelector value={selectedMode} onChange={setSelectedMode} />
				</div>
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					cancelButtonShow={false}
				/>
			</div>
		</Dialog>
	);
}

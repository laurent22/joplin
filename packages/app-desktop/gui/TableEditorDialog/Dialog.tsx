import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow, { ClickEvent } from '../DialogButtonRow';
import Dialog from '../Dialog';
import DialogTitle from '../DialogTitle';
import { parseMarkdownTable } from '../../../lib/markdownUtils';
import { Size } from '../ResizableLayout/utils/types';

interface Props {
	themeId: number;
	dispatch: Function;
	markdownTable: string;
	dialogContentMaxSize: Size;
}

const markdownTableToObject = (markdownTable: string): any => {
	const table = parseMarkdownTable(markdownTable);

	return {
		columns: table.headers.map(h => {
			return {
				title: h.label,
				field: h.name,
				hozAlign: h.justify,
				editor: 'input',
			};
		}),

		data: table.rows.map(row => {
			return {
				...row,
			};
		}),
	};
};

export default function(props: Props) {
	const elementId = `tabulator_${Math.floor(Math.random() * 1000000)}`;

	const onClose = useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'tableEditor',
		});
	}, [props.dispatch]);

	const onButtonRowClick = useCallback(async (event: ClickEvent) => {
		if (event.buttonName === 'cancel') {
			onClose();
			return;
		}

		if (event.buttonName === 'ok') {


			return;
		}
	}, [onClose]);

	useEffect(() => {
		const table = markdownTableToObject(props.markdownTable);
		const Tabulator = (window as any).Tabulator;

		// TODO: probably doesn't need to be called every time
		// TODO: Load CSS/JS dynamically?
		// TODO: Clean up on exit
		Tabulator.extendModule('edit', 'editors', {});

		new Tabulator(`#${elementId}`, {
			...table,
			height: props.dialogContentMaxSize.height,
		});
	}, []);

	function renderContent() {
		return (
			<div className="dialog-content">
				<div id={elementId}></div>
			</div>
		);
	}

	function renderDialogWrapper() {
		return (
			<div className="dialog-root">
				<DialogTitle title={_('Edit table')}/>
				{renderContent()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonLabel={_('Save')}
				/>
			</div>
		);
	}

	return (
		<Dialog onClose={onClose} renderContent={renderDialogWrapper}/>
	);
}

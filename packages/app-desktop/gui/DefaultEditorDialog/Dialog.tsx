import * as React from 'react';
import { useCallback } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow from '../DialogButtonRow';
import Dialog from '../Dialog';
import DialogTitle from '../DialogTitle';
import Button, { ButtonLevel } from '../Button/Button';
import bridge from '../../services/bridge';
import Setting from '@joplin/lib/models/Setting';

interface Props {
	themeId: number;
	onClose: ()=> void;
}

interface EditorInfo {
	name: EditorTargetInfoName;
	description: string;
}

const editorOptions: string[] = [
	'Rich Text Editor',
	'Markdown Editor',
];


const logosImageNames: Record<string, string> = {
	'Rich Text Editor': 'default-editor_RTE_icon.png',
	'Markdown Editor': 'default-editor_Markdown_icon.png',
};

const editorExamples: Record<string, string> = {
	'Rich Text Editor': 'default-editor_RTE.png',
	'Markdown Editor': 'default-editor_Markdown.png',
};

enum EditorTargetInfoName { RTE='Rich Text Editor' , Markdown='Markdown Editor'};

export default function(props: Props) {

	const onButtonRowClick = useCallback(() => {
		Setting.setValue('openDefaultEditorDialog', false);
		props.onClose();
	}, [props.onClose]);

	const onSelectButtonClick = useCallback(async (name: EditorTargetInfoName) => {
		const routes = {
			[EditorTargetInfoName.RTE]: { name: 'RTE' },
			[EditorTargetInfoName.Markdown]: { name: 'Markdown' },
		};
		const route = routes[name];

		Setting.setValue('defaultNoteEditor', route.name);
		Setting.setValue('openDefaultEditorDialog', false);
		props.onClose();
	}, [props.onClose]);

	function renderSelectArea(info: EditorInfo) {
		return (
			<Button
				className="selectButton"
				level={ButtonLevel.Primary}
				title={_('Select')}
				onClick={() => onSelectButtonClick(info.name as EditorTargetInfoName)}
				disabled={false}
			/>
		);
	}

	function renderEditorTarget(info: EditorInfo) {
		const key = `editorTarget_${info.name}`;

		const logoImageName = logosImageNames[info.name];
		const logoImageSrc = logoImageName ? `${bridge().buildDir()}/images/${logoImageName}` : '';
		const logo = logoImageSrc ? <img className="editorTargetLogo" src={logoImageSrc} /> : null;

		const exampleImageName = editorExamples[info.name];
		const exampleImageSrc = exampleImageName ? `${bridge().buildDir()}/images/${exampleImageName}` : '';
		const exampleImage = exampleImageSrc ? <img className="editorExample" src={exampleImageSrc}/> : null;
		const descriptionComp = (<div className="editorTargetDescription" > {info.description}</div>) ;

		return (
			<div className="editorTargetBox" id={key} key={key}>
				<p className="editorTargetTitle">{logo}{info.name}</p>
				{exampleImage}
				{descriptionComp}
				{renderSelectArea(info)}
			</div>
		);
	}

	function renderContent() {
		const boxes: React.ReactNode[] = [];

		for (const name of editorOptions) {
			if (name === EditorTargetInfoName.RTE) {
				const info = {
					name : EditorTargetInfoName.RTE,
          			description: _('Similar to Word and other WYSIWYG editors'),
				};
				boxes.push(renderEditorTarget(info));
			}
			if (name === EditorTargetInfoName.Markdown) {
				const info = {
					name: EditorTargetInfoName.Markdown,
					description: _('Lightweight markup language ideal for creating formatted text'),
				};
				boxes.push(renderEditorTarget(info));
			}
		}

		return (
			<div className="contentRoot">
			  <div className="editorTargetBoxes">
				{boxes}
			  </div>
			</div>
		  );
	}

	const renderChangeEditorWarning = () => {
		return <div className="changeEditorWarning">{`⚠️ ${_('In the future, to change the default editor, go to tools, then options and finally note.')}`}</div>;
	};

	function renderDialogWrapper() {
		return (
			<div className="styled-Root">
				<DialogTitle title={_('In Joplin you can write and edit notes using different text editors. Select one from the list below.')} justifyContent="center"/>
				{renderContent()}
				{renderChangeEditorWarning()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonShow={false}
					cancelButtonLabel={_('Close')}
				/>
			</div>
		);
	}

	return (
		<Dialog renderContent={renderDialogWrapper}/>
	);
}

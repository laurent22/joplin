import * as React from 'react';
import { useRef, useCallback } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow from '../DialogButtonRow';
import Dialog from '../Dialog';
import styled from 'styled-components';
import DialogTitle from '../DialogTitle';
import useElementSize from '@joplin/lib/hooks/useElementSize';
import Button, { ButtonLevel } from '../Button/Button';
import bridge from '../../services/bridge';
import Setting from '@joplin/lib/models/Setting';

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onClose: Function;
}

interface EditorInfo {
	name: string;
	description: string;
}

const StyledRoot = styled.div`
	min-width: 500px;
	max-width: 1200px;
`;

const EditorTargetDescription = styled.div<{ height: number }>`
	${props => props.height ? `height: ${props.height}px` : ''};
	margin-top: 1.3em;
	margin-bottom: 1.3em;
	line-height: ${props => props.theme.lineHeight};
	font-size: 14px;
`;

const ContentRoot = styled.div`
	background-color: ${props => props.theme.backgroundColor3};
	padding: 1em;
	padding-right: 0;
`;

const EditorTargetBoxes = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: center;
`;

const EditorTargetTitle = styled.p`
	display: flex;
	flex-direction: row;
	font-weight: bold;
	font-size: 1.7em;
	align-items: center;
	white-space: nowrap;
`;

const EditorTargetLogo = styled.img`
	height: 1.3em;
	margin-right: 0.4em;
`;

const EditorExample = styled.img`
	width: 100%;
	margin-top: 1em;
`;

const EditorTargetBox = styled.div`
	display: flex;
	flex: 1;
	flex-direction: column;
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.color};
	background-color: ${props => props.theme.backgroundColor};
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 8px;
	padding: 2em 2.2em 2em 2.2em;
	margin-right: 1em;
	max-width: 400px;
	opacity: 1;
`;

const SelectButton = styled(Button)`
	padding: 10px 10px;
    height: auto;
    min-height: auto;
    max-height: fit-content;
    font-size: 1em;
`;

const ChangeEditorWarning = styled.div`
	margin-top: 1em;
	opacity: 0.8;
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.color};
	font-size: 14px;
`;

const EditorOptions: string[] = [
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

type EditorTargetInfoName = 'Rich Text Editor' | 'Markdown Editor';

export default function(props: Props) {
	const joplinCloudDescriptionRef = useRef(null);

	const onButtonRowClick = useCallback(() => {
		Setting.setValue('openDefaultEditorDialog', false);
		props.onClose();
	}, [props.onClose]);

	const { height: descriptionHeight } = useElementSize(joplinCloudDescriptionRef);


	const onSelectButtonClick = useCallback(async (name: EditorTargetInfoName) => {
		const routes = {
			'Rich Text Editor': { name: 'RTE' },
			'Markdown Editor': { name: 'Markdown' },
		};
		const route = routes[name];

		Setting.setValue('defaultNoteEditor', route.name);
		Setting.setValue('openDefaultEditorDialog', false);
		await Setting.saveAll();
		props.onClose();
	}, [props.onClose]);

	function renderSelectArea(info: EditorInfo) {
		return (
			<SelectButton
				level={ButtonLevel.Primary}
				title={_('Select')}
				onClick={() => onSelectButtonClick(info.name as EditorTargetInfoName)}
				disabled={false}
			/>
		);
	}

	function renderEditorTarget(info: EditorInfo) {
		const key = `editorTarget_${info.name}`;
		const height = descriptionHeight;

		const logoImageName = logosImageNames[info.name];
		const logoImageSrc = logoImageName ? `${bridge().buildDir()}/images/${logoImageName}` : '';
		const logo = logoImageSrc ? <EditorTargetLogo src={logoImageSrc}/> : null;

		const exampleImageName = editorExamples[info.name];
		const exampleImageSrc = exampleImageName ? `${bridge().buildDir()}/images/${exampleImageName}` : '';
		const exampleImage = exampleImageSrc ? <EditorExample src={exampleImageSrc}/> : null;
		const descriptionComp = <EditorTargetDescription height={height} >{info.description}</EditorTargetDescription>;

		return (
			<EditorTargetBox id={key} key={key}>
				<EditorTargetTitle>{logo}{info.name}</EditorTargetTitle>
				{exampleImage}
				{descriptionComp}
				{renderSelectArea(info)}
			</EditorTargetBox>
		);
	}

	function renderContent() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const boxes: any[] = [];

		for (const name of EditorOptions) {
			if (name === 'Rich Text Editor') {
				const info = {
					name: 'Rich Text Editor',
					description: 'Similar to Word and other WYSIWYG editors',
				};
				boxes.push(renderEditorTarget(info));
			}
			if (name === 'Markdown Editor') {
				const info = {
					name: 'Markdown Editor',
					description: 'Lightweight markup language ideal for creating formatted text',
				};
				boxes.push(renderEditorTarget(info));
			}


		}

		return (
			<ContentRoot>
				<EditorTargetBoxes>
					{boxes}
				</EditorTargetBoxes>
			</ContentRoot>
		);
	}

	const renderChangeEditorWarning = () => {
		/* if (info.name === 'joplinCloud') return null;*/
		return <ChangeEditorWarning>{`⚠️ ${_('In the future, to change the default editor, go to tools, then options and finally note.')}`}</ChangeEditorWarning>;
	};

	function renderDialogWrapper() {
		return (
			<StyledRoot>
				<DialogTitle title={_('In Joplin you can write and edit notes using different text editors. Select one from the list below.')} justifyContent="center"/>
				{renderContent()}
				{renderChangeEditorWarning()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonShow={false}
					cancelButtonLabel={_('Close')}
				/>
			</StyledRoot>
		);
	}

	return (
		<Dialog renderContent={renderDialogWrapper}/>
	);
}

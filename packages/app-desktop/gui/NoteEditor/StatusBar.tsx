import * as React from 'react';
import ToolbarButton from '../ToolbarButton/ToolbarButton';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import CommandService from '@joplin/lib/services/CommandService';
import { themeStyle } from '@joplin/lib/theme';
import { AppState } from '../../app.reducer';
import { connect } from 'react-redux';
import { TagEntity } from '@joplin/lib/services/database/types';
import TagList from '../TagList';
import { _ } from '@joplin/lib/locale';
import { useCallback } from 'react';
import KeymapService from '@joplin/lib/services/KeymapService';
import bridge from '../../services/bridge';

interface Props {
	themeId: number;
	tabMovesFocus: boolean;
	noteId: string;
	setTagsToolbarButtonInfo: ToolbarButtonInfo;
	selectedNoteTags: TagEntity[];
	sourceUrl?: string;
}

interface StatusIndicatorProps {
	commandName: string;
	showWhenUnfocused: boolean;
	// Even if not visible, [label] should reflect the current state
	// of the indicator.
	label: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = props => {
	const runCommand = useCallback(() => {
		void CommandService.instance().execute(props.commandName);
	}, [props.commandName]);

	const keyshortcuts = KeymapService.instance().getAriaKeyShortcuts(props.commandName);
	return <span
		className={`status editor-status-indicator ${props.showWhenUnfocused ? '-show' : ''}`}
		aria-live='polite'
	>
		<button
			className='button'
			aria-keyshortcuts={keyshortcuts}
			onClick={runCommand}
		>
			{props.label}
		</button>
	</span>;
};

const StatusBar: React.FC<Props> = props => {
	function renderTagButton() {
		return <ToolbarButton
			themeId={props.themeId}
			toolbarButtonInfo={props.setTagsToolbarButtonInfo}
		/>;
	}

	function renderTagBar() {
		const theme = themeStyle(props.themeId);
		const noteIds = [props.noteId];
		const instructions = <span onClick={() => { void CommandService.instance().execute('setTags', noteIds); }} style={{ ...theme.clickableTextStyle, whiteSpace: 'nowrap' }}>{_('Click to add tags...')}</span>;
		const tagList = props.selectedNoteTags.length ? <TagList items={props.selectedNoteTags} /> : null;

		return <div className='tag-bar'>
			{renderTagButton()}
			<div className='content'>{tagList}{instructions}</div>
		</div>;
	}

	function renderSourceUrl() {
		if (!props.sourceUrl) return null;

		const allowedSchemes = ['http:', 'https:', 'mailto:'];
		let urlScheme = '';
		try {
			urlScheme = new URL(props.sourceUrl).protocol;
		} catch (_e) {
			return null;
		}
		if (!allowedSchemes.includes(urlScheme)) return null;

		const theme = themeStyle(props.themeId);
		const onSourceUrlClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
			event.preventDefault();
			void bridge().openExternal(props.sourceUrl);
		};

		const displayUrl = props.sourceUrl.length > 50 ? `${props.sourceUrl.substring(0, 50)}...` : props.sourceUrl;

		return (
			<div style={{ display: 'flex', alignItems: 'center', marginLeft: 10 }}>
				<i className='icon-link' style={{ ...theme.clickableTextStyle, marginRight: 5, fontSize: 12 }}></i>
				<a href={props.sourceUrl} onClick={onSourceUrlClick} style={{ ...theme.clickableTextStyle, textDecoration: 'underline' }} title={props.sourceUrl}>
					{displayUrl}
				</a>
			</div>
		);
	}

	const keyboardStatus = <StatusIndicator
		commandName='toggleTabMovesFocus'
		label={props.tabMovesFocus ? _('Tab moves focus') : _('Tab indents')}
		showWhenUnfocused={props.tabMovesFocus}
	/>;

	return <div className='editor-status-bar'>
		{renderTagBar()}
		{renderSourceUrl()}
		<div className='spacer'/>
		{keyboardStatus}
	</div>;
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		tabMovesFocus: state.settings['editor.tabMovesFocus'],
	};
})(StatusBar);

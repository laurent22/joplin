import * as React from 'react';
import { AppState } from '../app';
import KeymapService from '@joplin/lib/services/KeymapService';
import shim from '@joplin/lib/shim';

const { connect } = require('react-redux');
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('@joplin/lib/theme');

import BaseModel from '@joplin/lib/BaseModel';


const PLUGIN_NAME = 'quickSearch';

interface SearchResult {
	id: string;
	title: string;
	parent_id: string;
	fields: string[];
	fragments?: string;
	path?: string;
	type?: number;
	key: string;
}

interface Props {
	themeId: number;
	dispatch: Function;
	folders: any[];
	showCompletedTodos: boolean;
	userData: any;
}

interface State {
	query: string;
	results: SearchResult[];
	filteredResults: SearchResult[];
	selectedItemId: string;
	keywords: string[];
	listType: number;
	showHelp: boolean;
	resultsInBody: boolean;
	filterWord: string;
	chatMessages: string[];
	chatInput: string;
}


class QuickSearch {

	private dispatch: Function;
	public static Dialog: any;
	public static manifest: any;

	public onTrigger(event: any) {
		this.dispatch({
			type: 'PLUGINLEGACY_DIALOG_SET',
			open: true,
			pluginName: PLUGIN_NAME,
			userData: event.userData,
		});
	}

}


class Dialog extends React.PureComponent<Props, State> {

	private styles_: any;
	private inputRef: any;

	private listUpdateIID_: any;
	// private markupToHtml_: any;

	private constructor(props: Props) {
		super(props);

		const startString = props?.userData?.startString ? props?.userData?.startString : '';

		this.state = {
			query: startString,
			results: [],
			filteredResults: [],
			selectedItemId: null,
			keywords: [],
			listType: BaseModel.TYPE_NOTE,
			showHelp: false,
			resultsInBody: false,
			filterWord: '',
			chatMessages: [],
			chatInput: '',
		};

		this.styles_ = {};

		this.inputRef = React.createRef();

		this.onKeyDown = this.onKeyDown.bind(this);
		this.input_onKeyDown = this.input_onKeyDown.bind(this);
		this.modalLayer_onClick = this.modalLayer_onClick.bind(this);
		this.handleChatInputChange = this.handleChatInputChange.bind(this);
		this.handleChatSend = this.handleChatSend.bind(this);

	}

	private style() {
		const styleKey = [this.props.themeId, this.state.listType, this.state.resultsInBody ? '1' : '0'].join('-');

		if (this.styles_[styleKey]) return this.styles_[styleKey];

		const theme = themeStyle(this.props.themeId);

		let itemHeight = this.state.resultsInBody ? 84 : 64;

		if (this.state.listType === BaseModel.TYPE_COMMAND) {
			itemHeight = 40;
		}

		this.styles_[styleKey] = {
			dialogBox: Object.assign({}, theme.dialogBox, { minWidth: '50%', maxWidth: '50%' }),
			input: Object.assign({}, theme.inputStyle, { flex: 1 }),
			row: {
				overflow: 'hidden',
				minHeight: itemHeight,
				maxHeight: 200,
				display: 'flex',
				justifyContent: 'center',
				flexDirection: 'column',
				paddingLeft: 10,
				paddingRight: 10,
				borderBottomWidth: 1,
				borderBottomStyle: 'solid',
				borderBottomColor: theme.dividerColor,
				boxSizing: 'border-box',
			},
			help: Object.assign({}, theme.textStyle, { marginBottom: 10 }),
			inputHelpWrapper: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
		};

		const rowTextStyle = {
			fontSize: theme.fontSize,
			color: theme.color,
			fontFamily: theme.fontFamily,
			whiteSpace: 'nowrap',
			opacity: 0.7,
			userSelect: 'none',
		};

		const rowTitleStyle = Object.assign({}, rowTextStyle, {
			fontSize: rowTextStyle.fontSize * 1.4,
			marginBottom: this.state.resultsInBody ? 6 : 4,
			color: theme.colorFaded,
		});

		const rowFragmentsStyle = Object.assign({}, rowTextStyle, {
			fontSize: rowTextStyle.fontSize * 1.2,
			marginBottom: this.state.resultsInBody ? 8 : 6,
			color: theme.colorFaded,
		});

		this.styles_[styleKey].rowSelected = Object.assign({}, this.styles_[styleKey].row, { backgroundColor: theme.selectedColor });
		this.styles_[styleKey].rowPath = rowTextStyle;
		this.styles_[styleKey].rowTitle = rowTitleStyle;
		this.styles_[styleKey].rowFragments = rowFragmentsStyle;
		this.styles_[styleKey].itemHeight = itemHeight;

		return this.styles_[styleKey];
	}

	public componentDidMount() {
		document.addEventListener('keydown', this.onKeyDown);

		this.props.dispatch({
			type: 'VISIBLE_DIALOGS_ADD',
			name: 'quickSearch',
		});
	}

	public componentWillUnmount() {
		if (this.listUpdateIID_) shim.clearTimeout(this.listUpdateIID_);
		document.removeEventListener('keydown', this.onKeyDown);

		this.props.dispatch({
			type: 'VISIBLE_DIALOGS_REMOVE',
			name: 'quickSearch',
		});
	}

	private onKeyDown(event: any) {
		if (event.keyCode === 27) { // ESCAPE
			this.props.dispatch({
				pluginName: PLUGIN_NAME,
				type: 'PLUGINLEGACY_DIALOG_SET',
				open: false,
			});
		}
	}

	private modalLayer_onClick(event: any) {
		if (event.currentTarget == event.target) {
			this.props.dispatch({
				pluginName: PLUGIN_NAME,
				type: 'PLUGINLEGACY_DIALOG_SET',
				open: false,
			});
		}
	}





	private input_onKeyDown(event: any) {
		const keyCode = event.keyCode;

		if (keyCode === 13) { // ENTER
			event.preventDefault();

			this.setState({ query: event.target.value });

		}
	}

	private handleChatInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		this.setState({ chatInput: event.target.value });
	}

	private handleChatSend() {
		const { chatInput, chatMessages } = this.state;
		if (chatInput.trim() === '') return;
		this.setState({
			chatMessages: [...chatMessages, chatInput],
			chatInput: '',
		});
	}

	public render() {
		const theme = themeStyle(this.props.themeId);
		const style = this.style();
		const helpComp = !this.state.showHelp ? null : <div style={style.help}>{_('Type a note title or part of its content to jump to it. Or type # followed by a tag name, or @ followed by a notebook name. Or type : to search for commands.')}</div>;

		// --- Chat UI ---
		const chatContainerStyle: React.CSSProperties = {
			display: 'flex',
			flexDirection: 'column',
			height: 300,
			border: '1px solid #ccc',
			borderRadius: 8,
			padding: 8,
			marginBottom: 16,
			background: '#fafbfc',
		};
		const chatMessagesStyle: React.CSSProperties = {
			flex: 1,
			overflowY: 'auto',
			marginBottom: 8,
			display: 'flex',
			flexDirection: 'column',
			gap: 8,
		};
		const chatBubbleStyle: React.CSSProperties = {
			alignSelf: 'flex-end',
			background: '#4f8cff',
			color: 'white',
			borderRadius: '16px 16px 0 16px',
			padding: '8px 16px',
			maxWidth: '70%',
			wordBreak: 'break-word',
		};
		const chatInputRowStyle: React.CSSProperties = {
			display: 'flex',
			gap: 8,
		};
		const chatInputStyle: React.CSSProperties = {
			flex: 1,
			padding: 8,
			borderRadius: 8,
			border: '1px solid #ccc',
		};
		const chatSendButtonStyle: React.CSSProperties = {
			padding: '8px 16px',
			borderRadius: 8,
			background: '#4f8cff',
			color: 'white',
			border: 'none',
			cursor: 'pointer',
		};

		return (
			<div onClick={this.modalLayer_onClick} style={theme.dialogModalLayer}>
				<div style={style.dialogBox}>
					{helpComp}
					{/* --- Chat UI --- */}
					<div style={chatContainerStyle}>
						<div style={chatMessagesStyle}>
							{this.state.chatMessages.map((msg, idx) => (
								<div key={idx} style={chatBubbleStyle}>{msg}</div>
							))}
						</div>
						<div style={chatInputRowStyle}>
							<input
								type="text"
								value={this.state.chatInput}
								onChange={this.handleChatInputChange}
								style={chatInputStyle}
								placeholder="メッセージを入力..."
								onKeyDown={e => { if (e.key === 'Enter') this.handleChatSend(); }}
							/>
							<button style={chatSendButtonStyle} onClick={this.handleChatSend}>送信</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

}

const mapStateToProps = (state: AppState) => {
	return {
		folders: state.folders,
		themeId: state.settings.theme,
		showCompletedTodos: state.settings.showCompletedTodos,
		highlightedWords: state.highlightedWords,
	};
};

QuickSearch.Dialog = connect(mapStateToProps)(Dialog);

QuickSearch.manifest = {

	name: PLUGIN_NAME,
	menuItems: [
		{
			name: 'main',
			parent: 'tools',
			label: _('Quick Search...'),
			accelerator: () => KeymapService.instance().getAccelerator('quickSearch'),
			screens: ['Main'],
		},
	],

};

export default QuickSearch;

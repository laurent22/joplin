import * as React from 'react';
import { AppState } from '../app';
import KeymapService from '@joplin/lib/services/KeymapService';
import shim from '@joplin/lib/shim';

const { connect } = require('react-redux');
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('@joplin/lib/theme');

import BaseModel from '@joplin/lib/BaseModel';


const PLUGIN_NAME = 'quickSearch';

// 会話履歴をメモリに保存するための静的変数
let chatHistory: Array<{text: string; isUser: boolean}> = [];

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
	chatMessages: Array<{text: string; isUser: boolean}>;
	chatInput: string;
	dialogWidth: number; // 追加: ダイアログの幅
	dialogHeight: number; // 追加: ダイアログの高さ
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
	// private inputRef: any;

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
			chatMessages: [...chatHistory], // 保存された履歴を復元
			chatInput: '',
			dialogWidth: 900, // デフォルト幅を大きく
			dialogHeight: 700, // デフォルト高さを大きく
		};

		this.styles_ = {};

		// this.inputRef = React.createRef();

		this.onKeyDown = this.onKeyDown.bind(this);
		this.input_onKeyDown = this.input_onKeyDown.bind(this);
		this.modalLayer_onClick = this.modalLayer_onClick.bind(this);
		this.handleChatInputChange = this.handleChatInputChange.bind(this);
		this.handleChatSend = this.handleChatSend.bind(this);
		this.handleChatInputKeyDown = this.handleChatInputKeyDown.bind(this);

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

	private handleChatInputChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
		this.setState({ chatInput: event.target.value });
	}

	private handleChatInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
		const keyCode = event.keyCode;
		if (keyCode === 13) { // ENTER
			if (event.shiftKey) {
				// Shift + Enterで改行（デフォルトの動作を許可）
				return;
			} else {
				// Enterのみで送信
				event.preventDefault();
				this.handleChatSend();
			}
		}
	}

	private handleChatSend() {
		const { chatInput, chatMessages } = this.state;
		if (chatInput.trim() === '') return;

		// ユーザーメッセージを追加
		const newMessages = [...chatMessages, { text: chatInput, isUser: true }];

		this.setState({
			chatMessages: newMessages,
			chatInput: '',
		});

		// 履歴をメモリに保存
		chatHistory = newMessages;

		// APIを呼び出して回答を取得
		this.reply(chatInput);
	}

	private reply(input: string) {
		// サンプル実装：入力をそのまま返す
		const response = `回答: ${input}`;

		setTimeout(() => {
			this.setState(prevState => {
				const newMessages = [...prevState.chatMessages, { text: response, isUser: false }];
				// 履歴をメモリに保存
				chatHistory = newMessages;
				return {
					chatMessages: newMessages,
				};
			});
		}, 500); // 500ms遅延でリアルな感じに
	}



	private handleClearHistory = () => {
		this.setState({
			chatMessages: [],
		});
		// メモリからも履歴を削除
		chatHistory = [];
	};

	public render() {
		const theme = themeStyle(this.props.themeId);
		const style = this.style();
		const helpComp = !this.state.showHelp ? null : <div style={style.help}>{_('Type a note title or part of its content to jump to it. Or type # followed by a tag name, or @ followed by a notebook name. Or type : to search for commands.')}</div>;

		// --- Chat UI ---
		const chatContainerStyle: React.CSSProperties = {
			display: 'flex',
			flexDirection: 'column',
			height: (this.state.dialogHeight || 700) - 120, // ダイアログ高さから余白を引く
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
			borderRadius: '16px 16px 16px 16px',
			padding: '12px 20px',
			maxWidth: '50%',
			minWidth: '30%',
			wordBreak: 'break-word',
			position: 'relative',
			marginRight: 12,
			marginBottom: 4,
			whiteSpace: 'pre-wrap',
		};
		const chatBubbleReplyStyle: React.CSSProperties = {
			alignSelf: 'flex-start',
			background: '#f0f0f0',
			color: '#333',
			borderRadius: '16px 16px 16px 16px',
			padding: '12px 20px',
			maxWidth: '50%',
			minWidth: '30%',
			wordBreak: 'break-word',
			position: 'relative',
			marginLeft: 12,
			marginBottom: 4,
			whiteSpace: 'pre-wrap',
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
			resize: 'none',
			minHeight: 40,
			maxHeight: 120,
			fontFamily: 'inherit',
		};
		const chatSendButtonStyle: React.CSSProperties = {
			padding: '8px 16px',
			borderRadius: 8,
			background: '#4f8cff',
			color: 'white',
			border: 'none',
			cursor: 'pointer',
		};

		const clearHistoryBtnStyle: React.CSSProperties = {
			position: 'absolute',
			top: 10,
			right: 10,
			zIndex: 10,
			background: '#ff6b6b',
			color: 'white',
			border: 'none',
			borderRadius: 6,
			padding: '4px 12px',
			fontSize: 14,
			cursor: 'pointer',
			boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
			transition: 'background 0.2s',
		};

		return (
			<>
				<style>{`
				.chat-bubble::after {
					content: "";
					position: absolute;
					right: -8px;
					bottom: 8px;
					width: 0;
					height: 0;
					border-top: 12px solid transparent;
					border-left: 16px solid #4f8cff;
					border-bottom: 12px solid transparent;
				}
				.chat-bubble-reply::after {
					content: "";
					position: absolute;
					left: -8px;
					bottom: 8px;
					width: 0;
					height: 0;
					border-top: 12px solid transparent;
					border-right: 16px solid #f0f0f0;
					border-bottom: 12px solid transparent;
				}
				`}</style>
				<div onClick={this.modalLayer_onClick} style={theme.dialogModalLayer}>
					<div style={style.dialogBox}>
						<button style={clearHistoryBtnStyle} onClick={this.handleClearHistory} title="履歴を削除">
							🗑️
						</button>
						{helpComp}
						{/* --- Chat UI --- */}
						<div style={chatContainerStyle}>
							<div style={chatMessagesStyle}>
								{this.state.chatMessages.map((msg, idx) => (
									<div
										key={idx}
										style={msg.isUser ? chatBubbleStyle : chatBubbleReplyStyle}
										className={msg.isUser ? 'chat-bubble' : 'chat-bubble-reply'}
									>
										{msg.text}
									</div>
								))}
							</div>
							<div style={chatInputRowStyle}>
								<textarea
									value={this.state.chatInput}
									onChange={this.handleChatInputChange}
									style={chatInputStyle}
									placeholder="メッセージを入力..."
									onKeyDown={this.handleChatInputKeyDown}
								/>
								<button style={chatSendButtonStyle} onClick={this.handleChatSend}>送信</button>
							</div>
						</div>
					</div>
				</div>
			</>
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

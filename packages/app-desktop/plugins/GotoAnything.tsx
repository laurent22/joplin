import * as React from 'react';
import { AppState } from '../app.reducer';
import CommandService, { SearchResult as CommandSearchResult } from '@joplin/lib/services/CommandService';
import KeymapService from '@joplin/lib/services/KeymapService';
import shim from '@joplin/lib/shim';

const { connect } = require('react-redux');
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('@joplin/lib/theme');
import SearchEngine from '@joplin/lib/services/searchengine/SearchEngine';
import gotoAnythingStyleQuery from '@joplin/lib/services/searchengine/gotoAnythingStyleQuery';
import BaseModel from '@joplin/lib/BaseModel';
import Tag from '@joplin/lib/models/Tag';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
const { ItemList } = require('../gui/ItemList.min');
const HelpButton = require('../gui/HelpButton.min');
const { surroundKeywords, nextWhitespaceIndex, removeDiacritics } = require('@joplin/lib/string-utils.js');
import { mergeOverlappingIntervals } from '@joplin/lib/ArrayUtils';
import markupLanguageUtils from '../utils/markupLanguageUtils';
import focusEditorIfEditorCommand from '@joplin/lib/services/commands/focusEditorIfEditorCommand';
import Logger from '@joplin/lib/Logger';
import { MarkupToHtml } from '@joplin/renderer';

const logger = Logger.create('GotoAnything');

const PLUGIN_NAME = 'gotoAnything';

interface SearchResult {
	id: string;
	title: string;
	parent_id: string;
	fields: string[];
	fragments?: string;
	path?: string;
	type?: number;
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
	selectedItemId: string;
	keywords: string[];
	listType: number;
	showHelp: boolean;
	resultsInBody: boolean;
	commandArgs: string[];
}

interface CommandQuery {
	name: string;
	args: string[];
}

class GotoAnything {

	public dispatch: Function;
	public static Dialog: any;
	public static manifest: any;

	onTrigger(event: any) {
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
	private itemListRef: any;
	private listUpdateIID_: any;
	private markupToHtml_: MarkupToHtml;
	private userCallback_: any = null;

	constructor(props: Props) {
		super(props);

		const startString = props?.userData?.startString ? props?.userData?.startString : '';

		this.userCallback_ = props?.userData?.callback;

		this.state = {
			query: startString,
			results: [],
			selectedItemId: null,
			keywords: [],
			listType: BaseModel.TYPE_NOTE,
			showHelp: false,
			resultsInBody: false,
			commandArgs: [],
		};

		this.styles_ = {};

		this.inputRef = React.createRef();
		this.itemListRef = React.createRef();

		this.onKeyDown = this.onKeyDown.bind(this);
		this.input_onChange = this.input_onChange.bind(this);
		this.input_onKeyDown = this.input_onKeyDown.bind(this);
		this.modalLayer_onClick = this.modalLayer_onClick.bind(this);
		this.renderItem = this.renderItem.bind(this);
		this.listItem_onClick = this.listItem_onClick.bind(this);
		this.helpButton_onClick = this.helpButton_onClick.bind(this);

		if (startString) this.scheduleListUpdate();
	}

	style() {
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
				height: itemHeight,
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

		delete this.styles_[styleKey].dialogBox.maxHeight;

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

	componentDidMount() {
		document.addEventListener('keydown', this.onKeyDown);

		this.props.dispatch({
			type: 'VISIBLE_DIALOGS_ADD',
			name: 'gotoAnything',
		});
	}

	componentWillUnmount() {
		if (this.listUpdateIID_) shim.clearTimeout(this.listUpdateIID_);
		document.removeEventListener('keydown', this.onKeyDown);

		this.props.dispatch({
			type: 'VISIBLE_DIALOGS_REMOVE',
			name: 'gotoAnything',
		});
	}

	onKeyDown(event: any) {
		if (event.keyCode === 27) { // ESCAPE
			this.props.dispatch({
				pluginName: PLUGIN_NAME,
				type: 'PLUGINLEGACY_DIALOG_SET',
				open: false,
			});
		}
	}

	modalLayer_onClick(event: any) {
		if (event.currentTarget === event.target) {
			this.props.dispatch({
				pluginName: PLUGIN_NAME,
				type: 'PLUGINLEGACY_DIALOG_SET',
				open: false,
			});
		}
	}

	helpButton_onClick() {
		this.setState({ showHelp: !this.state.showHelp });
	}

	input_onChange(event: any) {
		this.setState({ query: event.target.value });

		this.scheduleListUpdate();
	}

	scheduleListUpdate() {
		if (this.listUpdateIID_) shim.clearTimeout(this.listUpdateIID_);

		this.listUpdateIID_ = shim.setTimeout(async () => {
			await this.updateList();
			this.listUpdateIID_ = null;
		}, 100);
	}

	async keywords(searchQuery: string) {
		const parsedQuery = await SearchEngine.instance().parseQuery(searchQuery);
		return SearchEngine.instance().allParsedQueryTerms(parsedQuery);
	}

	markupToHtml() {
		if (this.markupToHtml_) return this.markupToHtml_;
		this.markupToHtml_ = markupLanguageUtils.newMarkupToHtml();
		return this.markupToHtml_;
	}

	private parseCommandQuery(query: string): CommandQuery {
		const fullQuery = query;
		const splitted = fullQuery.split(/\s+/);
		return {
			name: splitted.length ? splitted[0] : '',
			args: splitted.slice(1),
		};
	}

	async updateList() {
		let resultsInBody = false;

		if (!this.state.query) {
			this.setState({ results: [], keywords: [] });
		} else {
			let results: SearchResult[] = [];
			let listType = null;
			let searchQuery = '';
			let keywords = null;
			let commandArgs: string[] = [];

			if (this.state.query.indexOf(':') === 0) { // COMMANDS
				const commandQuery = this.parseCommandQuery(this.state.query.substr(1));

				listType = BaseModel.TYPE_COMMAND;
				keywords = [commandQuery.name];
				commandArgs = commandQuery.args;

				const commandResults = CommandService.instance().searchCommands(commandQuery.name, true);

				results = commandResults.map((result: CommandSearchResult) => {
					return {
						id: result.commandName,
						title: result.title,
						parent_id: null,
						fields: [],
						type: BaseModel.TYPE_COMMAND,
					};
				});
			} else if (this.state.query.indexOf('#') === 0) { // TAGS
				listType = BaseModel.TYPE_TAG;
				searchQuery = `*${this.state.query.split(' ')[0].substr(1).trim()}*`;
				results = await Tag.searchAllWithNotes({ titlePattern: searchQuery });
			} else if (this.state.query.indexOf('@') === 0) { // FOLDERS
				listType = BaseModel.TYPE_FOLDER;
				searchQuery = `*${this.state.query.split(' ')[0].substr(1).trim()}*`;
				results = await Folder.search({ titlePattern: searchQuery });

				for (let i = 0; i < results.length; i++) {
					const row = results[i];
					const path = Folder.folderPathString(this.props.folders, row.parent_id);
					results[i] = Object.assign({}, row, { path: path ? path : '/' });
				}
			} else { // Note TITLE or BODY
				listType = BaseModel.TYPE_NOTE;
				searchQuery = gotoAnythingStyleQuery(this.state.query);
				results = await SearchEngine.instance().search(searchQuery);

				resultsInBody = !!results.find((row: any) => row.fields.includes('body'));

				if (!resultsInBody || this.state.query.length <= 1) {
					for (let i = 0; i < results.length; i++) {
						const row = results[i];
						const path = Folder.folderPathString(this.props.folders, row.parent_id);
						results[i] = Object.assign({}, row, { path: path });
					}
				} else {
					const limit = 20;
					const searchKeywords = await this.keywords(searchQuery);
					const notes = await Note.byIds(results.map((result: any) => result.id).slice(0, limit), { fields: ['id', 'body', 'markup_language', 'is_todo', 'todo_completed'] });
					// Can't make any sense of this code so...
					// @ts-ignore
					const notesById = notes.reduce((obj, { id, body, markup_language }) => ((obj[[id]] = { id, body, markup_language }), obj), {});

					// Filter out search results that are associated with non-existing notes.
					// https://github.com/laurent22/joplin/issues/5417
					results = results.filter(r => !!notesById[r.id]);

					for (let i = 0; i < results.length; i++) {
						const row = results[i];
						const path = Folder.folderPathString(this.props.folders, row.parent_id);

						if (row.fields.includes('body')) {
							let fragments = '...';

							if (i < limit) { // Display note fragments of search keyword matches
								const indices = [];
								const note = notesById[row.id];
								const body = this.markupToHtml().stripMarkup(note.markup_language, note.body, { collapseWhiteSpaces: true });

								// Iterate over all matches in the body for each search keyword
								for (let { valueRegex } of searchKeywords) {
									valueRegex = removeDiacritics(valueRegex);

									for (const match of removeDiacritics(body).matchAll(new RegExp(valueRegex, 'ig'))) {
										// Populate 'indices' with [begin index, end index] of each note fragment
										// Begins at the regex matching index, ends at the next whitespace after seeking 15 characters to the right
										indices.push([match.index, nextWhitespaceIndex(body, match.index + match[0].length + 15)]);
										if (indices.length > 20) break;
									}
								}

								// Merge multiple overlapping fragments into a single fragment to prevent repeated content
								// e.g. 'Joplin is a free, open source' and 'open source note taking application'
								// will result in 'Joplin is a free, open source note taking application'
								const mergedIndices = mergeOverlappingIntervals(indices, 3);
								fragments = mergedIndices.map((f: any) => body.slice(f[0], f[1])).join(' ... ');
								// Add trailing ellipsis if the final fragment doesn't end where the note is ending
								if (mergedIndices.length && mergedIndices[mergedIndices.length - 1][1] !== body.length) fragments += ' ...';

							}

							results[i] = Object.assign({}, row, { path, fragments });
						} else {
							results[i] = Object.assign({}, row, { path: path, fragments: '' });
						}
					}

					if (!this.props.showCompletedTodos) {
						results = results.filter((row: any) => !row.is_todo || !row.todo_completed);
					}
				}
			}

			// make list scroll to top in every search
			this.makeItemIndexVisible(0);

			this.setState({
				listType: listType,
				results: results,
				keywords: keywords ? keywords : await this.keywords(searchQuery),
				selectedItemId: results.length === 0 ? null : results[0].id,
				resultsInBody: resultsInBody,
				commandArgs: commandArgs,
			});
		}
	}

	private makeItemIndexVisible(index: number) {
		// Looks like it's not always defined
		// https://github.com/laurent22/joplin/issues/5184#issuecomment-879714850
		if (!this.itemListRef || !this.itemListRef.current) {
			logger.warn('Trying to set item index but the item list is not defined. Index: ', index);
			return;
		}

		this.itemListRef.current.makeItemIndexVisible(index);
	}

	async gotoItem(item: any) {
		this.props.dispatch({
			pluginName: PLUGIN_NAME,
			type: 'PLUGINLEGACY_DIALOG_SET',
			open: false,
		});

		if (this.userCallback_) {
			logger.info('gotoItem: user callback', item);

			this.userCallback_.resolve({
				type: this.state.listType,
				item: { ...item },
			});
			return;
		}

		if (item.type === BaseModel.TYPE_COMMAND) {
			logger.info('gotoItem: execute command', item);
			void CommandService.instance().execute(item.id, ...item.commandArgs);
			void focusEditorIfEditorCommand(item.id, CommandService.instance());
			return;
		}

		if (this.state.listType === BaseModel.TYPE_NOTE || this.state.listType === BaseModel.TYPE_FOLDER) {
			const folderPath = await Folder.folderPath(this.props.folders, item.parent_id);

			for (const folder of folderPath) {
				this.props.dispatch({
					type: 'FOLDER_SET_COLLAPSED',
					id: folder.id,
					collapsed: false,
				});
			}
		}

		if (this.state.listType === BaseModel.TYPE_NOTE) {
			logger.info('gotoItem: note', item);

			this.props.dispatch({
				type: 'FOLDER_AND_NOTE_SELECT',
				folderId: item.parent_id,
				noteId: item.id,
			});

			CommandService.instance().scheduleExecute('focusElement', 'noteBody');
		} else if (this.state.listType === BaseModel.TYPE_TAG) {
			logger.info('gotoItem: tag', item);

			this.props.dispatch({
				type: 'TAG_SELECT',
				id: item.id,
			});
		} else if (this.state.listType === BaseModel.TYPE_FOLDER) {
			logger.info('gotoItem: folder', item);

			this.props.dispatch({
				type: 'FOLDER_SELECT',
				id: item.id,
			});
		}
	}

	listItem_onClick(event: any) {
		const itemId = event.currentTarget.getAttribute('data-id');
		const parentId = event.currentTarget.getAttribute('data-parent-id');
		const itemType = Number(event.currentTarget.getAttribute('data-type'));

		void this.gotoItem({
			id: itemId,
			parent_id: parentId,
			type: itemType,
			commandArgs: this.state.commandArgs,
		});
	}

	renderItem(item: SearchResult) {
		const theme = themeStyle(this.props.themeId);
		const style = this.style();
		const isSelected = item.id === this.state.selectedItemId;
		const rowStyle = isSelected ? style.rowSelected : style.row;
		const titleHtml = item.fragments
			? `<span style="font-weight: bold; color: ${theme.color};">${item.title}</span>`
			: surroundKeywords(this.state.keywords, item.title, `<span style="font-weight: bold; color: ${theme.searchMarkerColor}; background-color: ${theme.searchMarkerBackgroundColor}">`, '</span>', { escapeHtml: true });

		const fragmentsHtml = !item.fragments ? null : surroundKeywords(this.state.keywords, item.fragments, `<span style="color: ${theme.searchMarkerColor}; background-color: ${theme.searchMarkerBackgroundColor}">`, '</span>', { escapeHtml: true });

		const folderIcon = <i style={{ fontSize: theme.fontSize, marginRight: 2 }} className="fa fa-book" />;
		const pathComp = !item.path ? null : <div style={style.rowPath}>{folderIcon} {item.path}</div>;
		const fragmentComp = !fragmentsHtml ? null : <div style={style.rowFragments} dangerouslySetInnerHTML={{ __html: (fragmentsHtml) }}></div>;

		return (
			<div key={item.id} className={isSelected ? 'selected' : null} style={rowStyle} onClick={this.listItem_onClick} data-id={item.id} data-parent-id={item.parent_id} data-type={item.type}>
				<div style={style.rowTitle} dangerouslySetInnerHTML={{ __html: titleHtml }}></div>
				{fragmentComp}
				{pathComp}
			</div>
		);
	}

	selectedItemIndex(results: any[] = undefined, itemId: string = undefined) {
		if (typeof results === 'undefined') results = this.state.results;
		if (typeof itemId === 'undefined') itemId = this.state.selectedItemId;
		for (let i = 0; i < results.length; i++) {
			const r = results[i];
			if (r.id === itemId) return i;
		}
		return -1;
	}

	selectedItem() {
		const index = this.selectedItemIndex();
		if (index < 0) return null;
		return { ...this.state.results[index], commandArgs: this.state.commandArgs };
	}

	input_onKeyDown(event: any) {
		const keyCode = event.keyCode;

		if (this.state.results.length > 0 && (keyCode === 40 || keyCode === 38)) { // DOWN / UP
			event.preventDefault();

			const inc = keyCode === 38 ? -1 : +1;
			let index = this.selectedItemIndex();
			if (index < 0) return; // Not possible, but who knows

			index += inc;
			if (index < 0) index = 0;
			if (index >= this.state.results.length) index = this.state.results.length - 1;

			const newId = this.state.results[index].id;

			this.makeItemIndexVisible(index);

			this.setState({ selectedItemId: newId });
		}

		if (keyCode === 13) { // ENTER
			event.preventDefault();

			const item = this.selectedItem();
			if (!item) return;

			void this.gotoItem(item);
		}
	}

	private calculateMaxHeight(itemHeight: number) {
		const maxItemCount = Math.floor((0.7 * window.innerHeight) / itemHeight);
		return maxItemCount * itemHeight;
	}

	renderList() {
		const style = this.style();

		const itemListStyle = {
			marginTop: 5,
			height: Math.min(style.itemHeight * this.state.results.length, this.calculateMaxHeight(style.itemHeight)),
		};

		return (
			<ItemList
				ref={this.itemListRef}
				itemHeight={style.itemHeight}
				items={this.state.results}
				style={itemListStyle}
				itemRenderer={this.renderItem}
			/>
		);
	}

	render() {
		const theme = themeStyle(this.props.themeId);
		const style = this.style();
		const helpComp = !this.state.showHelp ? null : <div className="help-text" style={style.help}>{_('Type a note title or part of its content to jump to it. Or type # followed by a tag name, or @ followed by a notebook name. Or type : to search for commands.')}</div>;

		return (
			<div className="modal-layer" onClick={this.modalLayer_onClick} style={theme.dialogModalLayer}>
				<div className="modal-dialog" style={style.dialogBox}>
					{helpComp}
					<div style={style.inputHelpWrapper}>
						<input autoFocus type="text" style={style.input} ref={this.inputRef} value={this.state.query} onChange={this.input_onChange} onKeyDown={this.input_onKeyDown} />
						<HelpButton onClick={this.helpButton_onClick} />
					</div>
					{this.renderList()}
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

GotoAnything.Dialog = connect(mapStateToProps)(Dialog);

GotoAnything.manifest = {

	name: PLUGIN_NAME,
	menuItems: [
		{
			id: 'gotoAnything',
			name: 'main',
			parent: 'go',
			label: _('Goto Anything...'),
			accelerator: () => KeymapService.instance().getAccelerator('gotoAnything'),
			screens: ['Main'],
		},
		{
			id: 'commandPalette',
			name: 'main',
			parent: 'tools',
			label: _('Command palette'),
			accelerator: () => KeymapService.instance().getAccelerator('commandPalette'),
			screens: ['Main'],
			userData: {
				startString: ':',
			},
		},
		{
			id: 'controlledApi',
		},
	],

};

export default GotoAnything;

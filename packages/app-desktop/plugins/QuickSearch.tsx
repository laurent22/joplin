import * as React from 'react';
import { AppState } from '../app';
import CommandService, { SearchResult as CommandSearchResult } from '@joplin/lib/services/CommandService';
import KeymapService from '@joplin/lib/services/KeymapService';
import shim from '@joplin/lib/shim';

const { connect } = require('react-redux');
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('@joplin/lib/theme');
import SearchEngine from '@joplin/lib/services/searchengine/SearchEngine';
import BaseModel from '@joplin/lib/BaseModel';
import Tag from '@joplin/lib/models/Tag';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
const { ItemList } = require('../gui/ItemList.min');
const HelpButton = require('../gui/HelpButton.min');
const { surroundKeywords, nextWhitespaceIndex, removeDiacritics } = require('@joplin/lib/string-utils.js');
import focusEditorIfEditorCommand from '@joplin/lib/services/commands/focusEditorIfEditorCommand';
import * as cheerio from 'cheerio';

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
}

interface QuickSearchItem {
	id: string;
	parent_id: string;
	type: number;
	keywords?: string;
}

class QuickSearch {

	// private dispatch: Function;
	public static Dialog: any;
	public static manifest: any;

	// private onTrigger(event: any) {
	// 	this.dispatch({
	// 		type: 'PLUGINLEGACY_DIALOG_SET',
	// 		open: true,
	// 		pluginName: PLUGIN_NAME,
	// 		userData: event.userData,
	// 	});
	// }

}

let gOnChangeTimer: null | number = null;
const gTimerDelay = 500; // 0.5 seconds

class Dialog extends React.PureComponent<Props, State> {

	private styles_: any;
	private inputRef: any;
	private itemListRef: any;
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
		};

		this.styles_ = {};

		this.inputRef = React.createRef();
		this.itemListRef = React.createRef();

		this.onKeyDown = this.onKeyDown.bind(this);
		this.input_onChange = this.input_onChange.bind(this);
		this.input_onKeyDown = this.input_onKeyDown.bind(this);
		this.filterOnKeyDown = this.filterOnKeyDown.bind(this);
		this.modalLayer_onClick = this.modalLayer_onClick.bind(this);
		this.renderItem = this.renderItem.bind(this);
		this.listItem_onClick = this.listItem_onClick.bind(this);
		this.helpButton_onClick = this.helpButton_onClick.bind(this);

		if (startString) this.scheduleListUpdate();
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

	private helpButton_onClick() {
		this.setState({ showHelp: !this.state.showHelp });
	}

	private input_onChange(event: any) {
		if (gOnChangeTimer) {
			clearTimeout(gOnChangeTimer);
			gOnChangeTimer = null;
		}

		const curEvent = event;
		const self = this;
		const value = curEvent.target.value;
		gOnChangeTimer = setTimeout(() => {
			gOnChangeTimer = null;
			self.setState({ query: value });
			self.scheduleListUpdate();
		}, gTimerDelay);
	}

	private scheduleListUpdate() {
		if (this.listUpdateIID_) shim.clearTimeout(this.listUpdateIID_);

		this.listUpdateIID_ = shim.setTimeout(async () => {
			await this.updateList();
			this.listUpdateIID_ = null;
		}, 100);
	}

	private makeSearchQuery(query: string) {
		const output = [];
		const splitted = query.split(' ');

		for (let i = 0; i < splitted.length; i++) {
			const s = splitted[i].trim();
			if (!s) continue;
			output.push(`${s}*`);
		}

		return output.join(' ');
	}

	private async keywords(searchQuery: string) {
		const parsedQuery = await SearchEngine.instance().parseQuery(searchQuery);
		return SearchEngine.instance().allParsedQueryTerms(parsedQuery);
	}


	private async searchCommands(query: string): Promise<SearchResult[]> {
		const commandResults = CommandService.instance().searchCommands(query, true);
		return commandResults.map((result: CommandSearchResult) => {
			return {
				id: result.commandName,
				title: result.title,
				parent_id: null as any,
				fields: [] as any[],
				type: BaseModel.TYPE_COMMAND,
				key: result.commandName,
			};
		});
	}

	private async searchTags(query: string): Promise<SearchResult[]> {
		const searchQuery = `*${query.split(' ')[0].substr(1).trim()}*`;
		return await Tag.searchAllWithNotes({ titlePattern: searchQuery });
	}

	private async searchFolders(query: string): Promise<SearchResult[]> {
		const searchQuery = `*${query.split(' ')[0].substr(1).trim()}*`;
		const results = await Folder.search({ titlePattern: searchQuery });

		for (let i = 0; i < results.length; i++) {
			const row = results[i];
			const path = Folder.folderPathString(this.props.folders, row.parent_id);
			results[i] = Object.assign({}, row, { path: path ? path : '/' });
		}
		return results;
	}

	private async searchNotes(query: string): Promise<{ results: SearchResult[]; resultsInBody: boolean }> {
		const searchQuery = this.makeSearchQuery(query);
		let results = await SearchEngine.instance().search(searchQuery);
		const resultsInBody = !!results.find((row: any) => row.fields.includes('body'));

		if (!resultsInBody || query.length <= 1) {
			for (let i = 0; i < results.length; i++) {
				const row = results[i];
				const path = Folder.folderPathString(this.props.folders, row.parent_id);
				results[i] = Object.assign({}, row, { path: path });
			}
		} else {
			results = await this.processNotesWithFragments(results, searchQuery);
		}

		if (!this.props.showCompletedTodos) {
			results = results.filter((row: any) => !row.is_todo || !row.todo_completed);
		}

		return { results, resultsInBody };
	}

	private async processNotesWithFragments(results: any[], searchQuery: string): Promise<SearchResult[]> {
		const limit = 20;
		const searchKeywords = await this.keywords(searchQuery);
		const notes = await Note.byIds(results.map((result: any) => result.id).slice(0, limit), { fields: ['id', 'body', 'markup_language', 'is_todo', 'todo_completed'] });
		// @ts-ignore
		const notesById = notes.reduce((obj, { id, body, markup_language }) => ((obj[[id]] = { id, body, markup_language }), obj), {});

		let ri = 0;
		const exists: Record<string, boolean> = {};
		const tempResults: SearchResult[] = [];

		for (let i = 0; i < results.length; i++) {
			const row = results[i];
			const path = Folder.folderPathString(this.props.folders, row.parent_id);

			if (row.fields.includes('body')) {
				const fragmentsList = this.extractFragments(row, notesById, searchKeywords, i, limit, exists);
				for (const tempFragment of fragmentsList) {
					tempResults.push(Object.assign({}, row, { key: ri, path, fragments: tempFragment }));
					ri++;
				}
			} else {
				tempResults.push(Object.assign({}, row, { key: ri, path: path, fragments: '' }));
				ri++;
			}
		}
		return tempResults;
	}

	private extractFragments(row: any, notesById: any, searchKeywords: any[], index: number, limit: number, exists: Record<string, boolean>): string[] {
		const fragmentsList: string[] = [];

		if (index < limit) {
			const indices = [];
			const note = notesById[row.id];
			const body = note.body;

			for (let { valueRegex } of searchKeywords) {
				valueRegex = removeDiacritics(valueRegex);
				for (const match of removeDiacritics(body).matchAll(new RegExp(valueRegex, 'ig'))) {
					indices.push([match.index, nextWhitespaceIndex(body, match.index + match[0].length + 15)]);
					if (indices.length > 20) break;
				}
			}

			for (const indexPair of indices) {
				const fragments = body.slice(indexPair[0], indexPair[1]);
				if (fragments.length > 0 && !exists[fragments]) {
					exists[fragments] = true;
					fragmentsList.push(fragments);
				}
			}
		}
		return fragmentsList;
	}

	private async updateList() {
		const updateListStart = Date.now();
		let resultsInBody = false;

		if (!this.state.query) {
			this.setState({ results: [], keywords: [] });
			return;
		}

		let results: SearchResult[] = [];
		let listType = null;
		let keywords = null;

		if (this.state.query.indexOf(':') === 0) { // COMMANDS
			const query = this.state.query.substr(1);
			listType = BaseModel.TYPE_COMMAND;
			keywords = [query];
			results = await this.searchCommands(query);
		} else if (this.state.query.indexOf('#') === 0) { // TAGS
			listType = BaseModel.TYPE_TAG;
			results = await this.searchTags(this.state.query);
		} else if (this.state.query.indexOf('@') === 0) { // FOLDERS
			listType = BaseModel.TYPE_FOLDER;
			results = await this.searchFolders(this.state.query);
		} else { // Note TITLE or BODY
			listType = BaseModel.TYPE_NOTE;
			const searchResult = await this.searchNotes(this.state.query);
			results = searchResult.results;
			resultsInBody = searchResult.resultsInBody;
		}

		// make list scroll to top in every search
		this.itemListRef.current.makeItemIndexVisible(0);
		let filteredResults = results;
		if (this.state.filterWord) {
			filteredResults = results.filter((item: SearchResult) => {
				const fragment = item.fragments ? item.fragments : '';
				return fragment.includes(this.state.filterWord) || item.title.includes(this.state.filterWord);
			});
		}

		const searchQuery = this.makeSearchQuery(this.state.query);
		this.setState({
			listType: listType,
			results: results,
			filteredResults: filteredResults,
			keywords: keywords ? keywords : await this.keywords(searchQuery),
			selectedItemId: results.length === 0 ? null : results[0].id,
			resultsInBody: resultsInBody,
		});

		const updateListEnd = Date.now();
		console.info(`QuickSearch: updateList took ${updateListEnd - updateListStart}ms for query "${this.state.query}" with ${this.state.results.length} results`);
	}

	private async gotoItem(item: QuickSearchItem) {
		this.props.dispatch({
			pluginName: PLUGIN_NAME,
			type: 'PLUGINLEGACY_DIALOG_SET',
			open: false,
		});

		if (item.type === BaseModel.TYPE_COMMAND) {
			void CommandService.instance().execute(item.id);
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
			this.props.dispatch({
				type: 'FOLDER_AND_NOTE_SELECT',
				folderId: item.parent_id,
				noteId: item.id,
				searchWord: item.keywords,
			});

			CommandService.instance().scheduleExecute('focusElement', 'noteBody');
		} else if (this.state.listType === BaseModel.TYPE_TAG) {
			this.props.dispatch({
				type: 'TAG_SELECT',
				id: item.id,
			});
		} else if (this.state.listType === BaseModel.TYPE_FOLDER) {
			this.props.dispatch({
				type: 'FOLDER_SELECT',
				id: item.id,
			});
		}
	}

	private extractFirstTextFromFragment(fragment: string): string {
		let fragmentText = fragment;
		try {
			const $ = cheerio.load(`<root>${fragment}</root>`);
			let text = '';
			$('root').contents().each((_, el) => {
				if (el.type === 'text') {
					text += $(el).text();
				}
			});
			fragmentText = text || fragment;
		} catch (e) {
			fragmentText = fragment;
		}
		return fragmentText.trim();
	}

	private listItem_onClick(event: React.MouseEvent<HTMLDivElement>) {
		const itemId = event.currentTarget.getAttribute('data-id');
		const parentId = event.currentTarget.getAttribute('data-parent-id');
		const itemType = Number(event.currentTarget.getAttribute('data-type'));
		const index = Number(event.currentTarget.getAttribute('data-index'));
		let fragment = '';
		if (!isNaN(index)) {
			fragment = this.state.results[index].fragments ?? '';
		}

		const fragmentText = this.extractFirstTextFromFragment(fragment);
		const item: QuickSearchItem = {
			id: itemId,
			parent_id: parentId,
			type: itemType,
			keywords: fragmentText,
		};
		void this.gotoItem(item);
	}

	private renderItem(item: SearchResult) {
		const theme = themeStyle(this.props.themeId);
		const style = this.style();
		const key = item.key === undefined ? item.id : item.key;
		const index = item.key === undefined ? undefined : item.key;
		const rowStyle = item.id === this.state.selectedItemId ? style.rowSelected : style.row;
		const titleHtml = item.fragments
			? `<span style="font-weight: bold; color: ${theme.colorBright};">${item.title}</span>`
			: surroundKeywords(this.state.keywords, item.title, `<span style="font-weight: bold; color: ${theme.colorBright};">`, '</span>', { escapeHtml: true });

		const fragmentsHtml = !item.fragments ? null : surroundKeywords(this.state.keywords, item.fragments, `<span style="font-weight: bold; color: ${theme.colorBright};">`, '</span>', { escapeHtml: true });

		const folderIcon = <i style={{ fontSize: theme.fontSize, marginRight: 2 }} className="fa fa-book" />;
		const pathComp = !item.path ? null : <div style={style.rowPath}>{folderIcon} {item.path}</div>;
		const fragmentComp = !fragmentsHtml ? null : <div style={style.rowFragments} dangerouslySetInnerHTML={{ __html: (fragmentsHtml) }}></div>;

		return (
			<div key={key} data-index={index} style={rowStyle} onClick={this.listItem_onClick} data-id={item.id} data-parent-id={item.parent_id} data-type={item.type}>
				<div style={style.rowTitle} dangerouslySetInnerHTML={{ __html: titleHtml }}></div>
				{fragmentComp}
				{pathComp}
			</div>
		);
	}

	private selectedItemIndex(results: any[] = undefined, itemId: string = undefined) {
		if (typeof results === 'undefined') results = this.state.results;
		if (typeof itemId === 'undefined') itemId = this.state.selectedItemId;
		for (let i = 0; i < results.length; i++) {
			const r = results[i];
			if (r.id === itemId) return i;
		}
		return -1;
	}

	private filterOnKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		const keyCode = event.keyCode;
		if (keyCode === 13) { // ENTER
			event.preventDefault();
			const filterWord = event.currentTarget.value.trim();
			this.setState({ filterWord: filterWord });
			let filteredResults = this.state.results;
			if (filterWord) {
				filteredResults = this.state.results.filter((item: SearchResult) => {
					const fragment = item.fragments ? item.fragments : '';
					return fragment.includes(filterWord) || item.title.includes(filterWord) || item.path?.includes(filterWord);
				});
			}
			this.setState({ filteredResults: filteredResults });
			this.scheduleListUpdate();
		}
	}

	private input_onKeyDown(event: any) {
		const keyCode = event.keyCode;

		if (this.state.results.length > 0 && (keyCode === 40 || keyCode === 38)) { // DOWN / UP
			event.preventDefault();

			const inc = keyCode === 38 ? -1 : +1;
			let index = this.selectedItemIndex();
			if (index < 0) return;

			index += inc;
			if (index < 0) index = 0;
			if (index >= this.state.results.length) index = this.state.results.length - 1;

			const newId = this.state.results[index].id;

			this.itemListRef.current.makeItemIndexVisible(index);

			this.setState({ selectedItemId: newId });
		}

		if (keyCode === 13) { // ENTER
			event.preventDefault();

			console.log(`QuickSearch: Enter pressed with query "${this.state.query}" and selected item "${this.state.selectedItemId}"`);
			if (gOnChangeTimer) {
				clearTimeout(gOnChangeTimer);
				gOnChangeTimer = null;
			}

			gOnChangeTimer = null;
			this.setState({ query: event.target.value });
			this.scheduleListUpdate();
		}
	}

	private renderList() {
		const style = this.style();

		const itemListStyle = {
			marginTop: 5,
			height: Math.min(style.itemHeight * this.state.results.length, 10 * style.itemHeight),
		};
		return (
			<ItemList
				ref={this.itemListRef}
				itemHeight={style.itemHeight}
				items={this.state.filteredResults}
				style={itemListStyle}
				itemRenderer={this.renderItem}
			/>
		);
	}

	public render() {
		const theme = themeStyle(this.props.themeId);
		const style = this.style();
		const helpComp = !this.state.showHelp ? null : <div style={style.help}>{_('Type a note title or part of its content to jump to it. Or type # followed by a tag name, or @ followed by a notebook name. Or type : to search for commands.')}</div>;

		return (
			<div onClick={this.modalLayer_onClick} style={theme.dialogModalLayer}>
				<div style={style.dialogBox}>
					{helpComp}
					<div style={style.inputHelpWrapper}>
						<label style={{ marginRight: 8 }}>クイック検索</label>
						<input autoFocus type="text" style={style.input} ref={this.inputRef} onChange={this.input_onChange} onKeyDown={this.input_onKeyDown} />
						<HelpButton onClick={this.helpButton_onClick} />
					</div>
					<div style={style.inputHelpWrapper}>
						<label style={{ marginRight: 8 }}>フィルタ</label>
						<input type="text" style={{ flex: 1, width: '100%' }} onKeyDown={this.filterOnKeyDown}/>
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

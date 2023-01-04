const React = require('react');

import { StyleSheet, View, TextInput, FlatList, TouchableHighlight } from 'react-native';
const { connect } = require('react-redux');
import ScreenHeader from '../ScreenHeader';
const Icon = require('react-native-vector-icons/Ionicons').default;
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import gotoAnythingStyleQuery from '@joplin/lib/services/searchengine/gotoAnythingStyleQuery';
const { NoteItem } = require('../note-item.js');
const { BaseScreenComponent } = require('../base-screen.js');
const { themeStyle } = require('../global-style.js');
const DialogBox = require('react-native-dialogbox').default;
import SearchEngineUtils from '@joplin/lib/services/searchengine/SearchEngineUtils';
import SearchEngine from '@joplin/lib/services/searchengine/SearchEngine';
import { AppState } from '../../utils/types';

// We need this to suppress the useless warning
// https://github.com/oblador/react-native-vector-icons/issues/1465
Icon.loadFont().catch((error) => { console.info(error); });

class SearchScreenComponent extends BaseScreenComponent {

	private state: any = null;
	private isMounted_ = false;
	private styles_: any = {};
	private scheduleSearchTimer_: any = null;

	static navigationOptions() {
		return { header: null } as any;
	}

	constructor() {
		super();
		this.state = {
			query: '',
			notes: [],
		};
	}

	styles() {
		const theme = themeStyle(this.props.themeId);

		if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
		this.styles_ = {};

		const styles: any = {
			body: {
				flex: 1,
			},
			searchContainer: {
				flexDirection: 'row',
				alignItems: 'center',
				borderWidth: 1,
				borderColor: theme.dividerColor,
			},
		};

		styles.searchTextInput = Object.assign({}, theme.lineInput);
		styles.searchTextInput.paddingLeft = theme.marginLeft;
		styles.searchTextInput.flex = 1;
		styles.searchTextInput.backgroundColor = theme.backgroundColor;
		styles.searchTextInput.color = theme.color;

		styles.clearIcon = Object.assign({}, theme.icon);
		styles.clearIcon.color = theme.colorFaded;
		styles.clearIcon.paddingRight = theme.marginRight;
		styles.clearIcon.backgroundColor = theme.backgroundColor;

		this.styles_[this.props.themeId] = StyleSheet.create(styles);
		return this.styles_[this.props.themeId];
	}

	componentDidMount() {
		this.setState({ query: this.props.query });
		void this.refreshSearch(this.props.query);
		this.isMounted_ = true;
	}

	componentWillUnmount() {
		this.isMounted_ = false;
	}

	clearButton_press() {
		this.props.dispatch({
			type: 'SEARCH_QUERY',
			query: '',
		});

		this.setState({ query: '' });
		void this.refreshSearch('');
	}

	async refreshSearch(query: string = null) {
		if (!this.props.visible) return;

		query = gotoAnythingStyleQuery(query);

		let notes = [];

		if (query) {
			if (this.props.settings['db.ftsEnabled']) {
				notes = await SearchEngineUtils.notesForQuery(query, true);
			} else {
				const p = query.split(' ');
				const temp = [];
				for (let i = 0; i < p.length; i++) {
					const t = p[i].trim();
					if (!t) continue;
					temp.push(t);
				}

				notes = await Note.previews(null, {
					anywherePattern: `*${temp.join('*')}*`,
				});
			}
		}

		if (!this.isMounted_) return;

		const parsedQuery = await SearchEngine.instance().parseQuery(query);
		const highlightedWords = SearchEngine.instance().allParsedQueryTerms(parsedQuery);

		this.props.dispatch({
			type: 'SET_HIGHLIGHTED',
			words: highlightedWords,
		});

		this.setState({ notes: notes });
	}

	scheduleSearch() {
		if (this.scheduleSearchTimer_) clearTimeout(this.scheduleSearchTimer_);

		this.scheduleSearchTimer_ = setTimeout(() => {
			this.scheduleSearchTimer_ = null;
			void this.refreshSearch(this.state.query);
		}, 200);
	}

	searchTextInput_changeText(text: string) {
		this.setState({ query: text });

		this.props.dispatch({
			type: 'SEARCH_QUERY',
			query: text,
		});

		this.scheduleSearch();
	}

	render() {
		if (!this.isMounted_) return null;

		const theme = themeStyle(this.props.themeId);

		const rootStyle = {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		};

		if (!this.props.visible) {
			rootStyle.flex = 0.001; // This is a bit of a hack but it seems to work fine - it makes the component invisible but without unmounting it
		}

		const thisComponent = this;

		return (
			<View style={rootStyle}>
				<ScreenHeader
					title={_('Search')}
					parentComponent={thisComponent}
					folderPickerOptions={{
						enabled: this.props.noteSelectionEnabled,
						mustSelect: true,
					}}
					showSideMenuButton={false}
					showSearchButton={false}
				/>
				<View style={this.styles().body}>
					<View style={this.styles().searchContainer}>
						<TextInput
							style={this.styles().searchTextInput}
							autoFocus={this.props.visible}
							underlineColorAndroid="#ffffff00"
							onChangeText={text => this.searchTextInput_changeText(text)}
							value={this.state.query}
							selectionColor={theme.textSelectionColor}
							keyboardAppearance={theme.keyboardAppearance}
						/>
						<TouchableHighlight onPress={() => this.clearButton_press()}>
							<Icon name="md-close-circle" style={this.styles().clearIcon} />
						</TouchableHighlight>
					</View>

					<FlatList data={this.state.notes} keyExtractor={(item) => item.id} renderItem={event => <NoteItem note={event.item} />} />
				</View>
				<DialogBox
					ref={(dialogbox: any) => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}
}

const SearchScreen = connect((state: AppState) => {
	return {
		query: state.searchQuery,
		themeId: state.settings.theme,
		settings: state.settings,
		noteSelectionEnabled: state.noteSelectionEnabled,
	};
})(SearchScreenComponent);

module.exports = { SearchScreen };

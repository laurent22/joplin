import React, { Component } from 'react';
import { ListView, StyleSheet, View, TextInput, FlatList, TouchableHighlight } from 'react-native';
import { connect } from 'react-redux'
import { ScreenHeader } from 'lib/components/screen-header.js';
import Icon from 'react-native-vector-icons/Ionicons';
import { _ } from 'lib/locale.js';
import { Note } from 'lib/models/note.js';
import { NoteItem } from 'lib/components/note-item.js';
import { BaseScreenComponent } from 'lib/components/base-screen.js';
import { globalStyle } from 'lib/components/global-style.js';

let styles = {
	body: {
		flex: 1,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: globalStyle.dividerColor,
	}
}

styles.searchTextInput = Object.assign({}, globalStyle.lineInput);
styles.searchTextInput.paddingLeft = globalStyle.marginLeft;
styles.searchTextInput.flex = 1;

styles.clearIcon = Object.assign({}, globalStyle.icon);
styles.clearIcon.color = globalStyle.colorFaded;
styles.clearIcon.paddingRight = globalStyle.marginRight;
styles.clearIcon.backgroundColor = globalStyle.backgroundColor;

styles = StyleSheet.create(styles);

class SearchScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			query: '',
			notes: [],
		};
		this.isMounted_ = false;
	}

	componentDidMount() {
		this.setState({ query: this.props.query });
		this.refreshSearch(this.props.query);
		this.isMounted_ = true;
	}

	componentWillUnmount() {
		this.isMounted_ = false;
	}

	componentWillReceiveProps(newProps) {
		let newState = {};
		if ('query' in newProps) newState.query = newProps.query;

		if (Object.getOwnPropertyNames(newState).length) {
			this.setState(newState);
			this.refreshSearch(newState.query);
		}
	}

	searchTextInput_submit() {
		const query = this.state.query.trim();
		if (!query) return;

		this.props.dispatch({
			type: 'SEARCH_QUERY',
			query: query,
		});
	}

	clearButton_press() {
		this.props.dispatch({
			type: 'SEARCH_QUERY',
			query: '',
		});
	}

	async refreshSearch(query = null) {
		query = query === null ? this.state.query.trim : query.trim();

		let notes = []

		if (query) {
			notes = await Note.previews(null, {
				anywherePattern: '*' + query + '*',
			});
		}

		if (!this.isMounted_) return;

		this.setState({ notes: notes });
	}

	searchTextInput_changeText(text) {
		this.setState({ query: text });
	}

	render() {
		return (
			<View style={this.styles().screen}>
				<ScreenHeader navState={this.props.navigation.state} />
				<View style={styles.body}>
					<View style={styles.searchContainer}>
						<TextInput
							style={styles.searchTextInput}
							underlineColorAndroid="#ffffff00" 
							onSubmitEditing={() => { this.searchTextInput_submit() }}
							onChangeText={(text) => this.searchTextInput_changeText(text) }
							value={this.state.query}
						/>
						<TouchableHighlight onPress={() => this.clearButton_press() }>
							<Icon name='md-close-circle' style={styles.clearIcon} />
						</TouchableHighlight>
					</View>

					<FlatList
						data={this.state.notes}
						keyExtractor={(item, index) => item.id}
						renderItem={(event) => <NoteItem
							note={event.item}
						/>}
					/>
				</View>
			</View>
		);
	}

}

const SearchScreen = connect(
	(state) => {
		return {
			query: state.searchQuery,
		};
	}
)(SearchScreenComponent)

export { SearchScreen };
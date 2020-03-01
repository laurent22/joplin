/**
 * Inspired by https://github.com/kunall17/MarkdownEditor
 */

import React from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	Platform,
	KeyboardAvoidingView,
	TouchableOpacity,
	Image,
} from 'react-native';
import { renderFormatButtons } from './renderButtons';
import { NoteBodyViewer } from 'lib/components/note-body-viewer.js';

// TODO: Support custom themes
const FOREGROUND_COLOR = 'rgba(82, 194, 175, 1)';
const styles = StyleSheet.create({
	buttonContainer: {
		flex: 0,
		flexDirection: 'row',
	},
	screen: { // Wrapper around the editor and the preview
		flex: 1,
		flexDirection: 'column',
		alignItems: 'stretch',
	},
});

export default class MarkdownEditor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			text: props.value,
			selection: { start: 0, end: 0 },
			showPreview: props.showPreview ? props.showPreview : false,
		};
	}
	textInput: TextInput;

	changeText = (selection: {start: number, end: number}) => (input: string) => {
		var result = input;
		const cursor = selection.start;
		const isOnNewline = '\n' === input.slice(cursor - 1, cursor);
		const isDeletion = input.length < this.state.text.length;
		if (isOnNewline && !isDeletion) {
			const prevLines = input.slice(0, cursor - 1).split('\n');
			const prevLine = prevLines[prevLines.length - 1];

			const insertListLine = (bullet) => ([
				prevLines.join('\n'), // Previous text
				`\n${bullet} `, // Current line with new bullet point
				input.slice(cursor, input.length), // Following text
			].join(''));

			const insertedEndListLine = [
				// Previous text (all but last bullet line, which we remove)
				prevLines.slice(0, prevLines.length - 1).join('\n') ,
				'\n\n', // Two newlines to get out of the list
				input.slice(cursor, input.length), // Following text
			].join('');

			// Add new ordered list line item
			if (prevLine.startsWith('- ') && !prevLine.startsWith('- [ ')) {
				// If the bullet on the previous line isn't empty, add a new bullet.
				if (prevLine.trim() !== '-') {
					result = insertListLine('-');
				} else {
					result = insertedEndListLine;
				}
			}

			// Add new checklist line item
			if ((prevLine.startsWith('- [ ] ') || prevLine.startsWith('- [x] '))) {
				// If the bullet on the previous line isn't empty, add a new bullet.
				if (prevLine.trim() !== '- [ ]' && prevLine.trim() !== '- [x]') {
					result = insertListLine('- [ ]');
				} else {
					result = insertedEndListLine;
				}
			}

			// Add new ordered list item
			if (/^\d+\./.test(prevLine)) {
				// If the bullet on the previous line isn't empty, add a new bullet.
				const digit = Number(prevLine.match(/^\d+/)[0]);
				if (prevLine.trim() !== `${digit}.`) {
					result = insertListLine(`${digit + 1}.`);
				} else {
					result = insertedEndListLine;
				}
			}
		}
		console.log(input.split('\n'));
		this.setState({ text: result });
		this.props.saveText(result);
		if (this.props.onMarkdownChange) this.props.onMarkdownChange(input);
	};

	onSelectionChange = event => {
		// console.log('selection change:', {event});
		this.setState({
			selection: event.nativeEvent.selection,
		});
	};

	componentDidMount() {
		this.textInput.focus();
	}

	getState = () => {
		this.setState({selection: {start: 1, end: 1}});
		return this.state;
	};

	convertMarkdown = () => {
		this.setState({ showPreview: !this.state.showPreview });
	};

	renderPreview = () => {
		return (
			<NoteBodyViewer {...this.props.noteBodyViewer} />
		);
	};

	render() {
		const WrapperView = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
		const { Formats, markdownButton } = this.props;
		const { text, selection, showPreview } = this.state;
		return (
			<WrapperView style={styles.screen}>
				<TextInput
					{...this.props}
					multiline
					autoCapitalize="sentences"
					underlineColorAndroid="transparent"
					onChangeText={this.changeText(selection)}
					onSelectionChange={this.onSelectionChange}
					value={text}
					ref={textInput => (this.textInput = textInput)}
					selection={selection}
				/>
				{showPreview ? this.renderPreview() : null}
				<View style={styles.buttonContainer}>
					<TouchableOpacity
						onPress={this.convertMarkdown}
						style={{ padding: 8, borderRightWidth: 1, borderColor: FOREGROUND_COLOR }}>
						<Image
							style={[styles.button, { tintColor: FOREGROUND_COLOR, padding: 8 }]}
							source={require('./static/visibility.png')}
							resizeMode="cover"
						/>
					</TouchableOpacity>
					{renderFormatButtons(
						{
							getState: this.getState,
							setState: (state, callback) => {
								this.textInput.focus();
								this.setState(state, callback);
							},
						},
						Formats,
						markdownButton,
					)}
				</View>
			</WrapperView>
		);
	}
}

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

const MarkdownPreviewButton = (props) =>
	<TouchableOpacity
		onPress={props.convertMarkdown}
		style={{ padding: 8, borderRightWidth: 1, borderColor: props.borderColor }}>
		<Image
			style={{ tintColor: props.color, padding: 8 }}
			source={require('./static/visibility.png')}
			resizeMode="cover"
		/>
	</TouchableOpacity>;

export default class MarkdownEditor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			text: props.value,
			selection: { start: 0, end: 0 },
			// Show preview by default
			showPreview: props.showPreview ? props.showPreview : true,
		};
		this.textAreaRef = React.createRef(); // For focusing the textarea
	}
	textInput: TextInput;

	changeText = (selection: {start: number, end: number}) => (input: string) => {
		let result = input;
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
		// Hide Markdown preview on text change
		this.setState({ text: result, showPreview: false });
		this.props.saveText(result);
		if (this.props.onMarkdownChange) this.props.onMarkdownChange(input);
	};

	onSelectionChange = event => {
		this.setState({ selection: event.nativeEvent.selection });
	};

	focus = () => this.textAreaRef.current.focus()

	convertMarkdown = () => this.setState({ showPreview: !this.state.showPreview })

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
					ref={this.textAreaRef}
					selection={selection}
				/>
				{showPreview && <NoteBodyViewer {...this.props.noteBodyViewer} />}
				<View style={styles.buttonContainer}>
					<MarkdownPreviewButton
						convertMarkdown={this.convertMarkdown}
						borderColor={this.props.borderColor}
						color={this.props.markdownButtonsColor}
					/>
					{renderFormatButtons(
						{
							color: this.props.markdownButtonsColor,
							getState: () => this.state,
							setState: (state, callback) => {
								// Hide Markdown preview on text change
								this.setState({ showPreview: false });
								this.setState(state, callback);
							},
						},
						Formats,
						markdownButton
					)}
				</View>
			</WrapperView>
		);
	}
}

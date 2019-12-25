import React from 'react';
import {
	View,
	StyleSheet,
	TextInput,
	Platform,
	KeyboardAvoidingView,
	TouchableOpacity,
	Image,
	ScrollView,
} from 'react-native';
const { editorFont } = require('lib/components/global-style.js');

import { renderFormatButtons } from './renderButtons';

const FOREGROUND_COLOR = 'rgba(82, 194, 175, 1)';
const styles = StyleSheet.create({
	composeText: {
		borderColor: FOREGROUND_COLOR,
		borderWidth: 1,
		flexDirection: 'column',
		flex: 1,
		padding: 4,
		paddingLeft: 8,
		fontSize: 16,
	},
	buttonContainer: {
		flex: 0,
		flexDirection: 'row',
	},
	inlinePadding: {
		padding: 8,
	},
	preview: {
		flex: 0.2,
		padding: 5,
		borderWidth: 1,
		borderColor: FOREGROUND_COLOR,
	},
	screen: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'stretch',
		backgroundColor: 'white',
	},
});

// const markdownStyles = {
// 	heading1: {
// 		fontSize: 24,
// 		color: 'purple',
// 	},
// 	link: {
// 		color: 'pink',
// 	},
// 	mailTo: {
// 		color: 'orange',
// 	},
// 	text: {
// 		color: '#555555',
// 	},
// };

export default class MarkdownEditor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			text: props.defaultText || '',
			selection: { start: 0, end: 0 },
			showPreview: props.showPreview ? props.showPreview : false,
		};
	}
	textInput: TextInput;

	changeText = (selection: {start: number, end: number}) => (input: string) => {
		console.log({selection, input: input.length, state: this.state.text.length});

		var result = input;
		const cursor = selection.start;
		const isOnNewline = '\n' === input.slice(cursor - 1, cursor);
		const isDeletion = input.length < this.state.text.length;
		if (isOnNewline && !isDeletion) {
			const prevLines = input.slice(0, cursor - 1).split('\n');
			const prevLine = prevLines[prevLines.length - 1];
			console.log({
				isOnNewline,
				prevLines: JSON.stringify(prevLines),
				prevLine,
			});
			const prevLineIsUnorderedList = (
				prevLine.startsWith('- ') &&
				!prevLine.startsWith('- [ ')
				&& prevLine !== '- '
			);
			if (prevLineIsUnorderedList) {
				result = [
					prevLines.join('\n'), // previous text
					'\n- ', // current line
					input.slice(cursor, input.length), // following text
				].join('');
			}
			// TODO: make this into ol handler
			const prevLineIsChecklist = (
				(prevLine.startsWith('- [ ] ') || prevLine.startsWith('- [x] ')) &&
				prevLine !== '- [ ] ' && prevLine !== '- [x] '
			);
			if (prevLineIsChecklist) {
				result = [
					prevLines.join('\n'), // previous text
					'\n- [ ] ', // current line
					input.slice(cursor, input.length), // following text
				].join('');
			}
		}
		console.log(input.split('\n'));
		this.setState({ text: result });
		// this.saveText(text)
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
		this.setState({
			selection: {
				start: 1,
				end: 1,
			},
		});
		return this.state;
	};

	convertMarkdown = () => {
		this.setState({ showPreview: !this.state.showPreview });
	};

	renderPreview = () => {
		return (
			<View style={styles.preview}>
				<ScrollView removeClippedSubviews>
					{/* <MarkdownView styles={markdownStyles}>
						{this.state.text === '' ? 'Markdown preview here' : this.state.text}
					</MarkdownView> */}
					{/* TODO: */}
				</ScrollView>
			</View>
		);
	};

	render() {
		const WrapperView = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
		const { Formats, markdownButton } = this.props;
		const { text, selection, showPreview } = this.state;
		return (
			<WrapperView behavior="padding" style={styles.screen}>
				<TextInput
					style={{...styles.composeText, fontFamily: editorFont(this.props.editorFont)}}
					multiline
					underlineColorAndroid="transparent"
					onChangeText={this.changeText(selection)}
					// onChange={this.onChange}
					onSelectionChange={this.onSelectionChange}
					value={text}
					placeholder={'Write a long message'}
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
							source={require('../static/visibility.png')}
							resizeMode={'cover'}
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

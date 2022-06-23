/**
 * Pop-up dialog for editing the content of a link.
 */

const React = require('react');
const { useState, useEffect, useMemo } = require('react');
const { StyleSheet } = require('react-native');
const { View, Modal, Text, TextInput, Button } = require('react-native');

import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
import { EditorControl, SelectionFormatting } from './EditorType';

interface LinkDialogProps {
	editorControl: EditorControl;
	selectionState: SelectionFormatting;
	visible: boolean;
	themeId: number;
}

const EditLinkDialog = (props: LinkDialogProps) => {
	// The content of the link selected in the editor (if any)
	const editorLinkData = props.selectionState.linkData;
	const [linkLabel, setLinkLabel] = useState('');
	const [linkURL, setLinkURL] = useState('');

	// Reset the label and URL when shown/hidden
	useEffect(() => {
		setLinkLabel(editorLinkData.linkText ?? props.selectionState.selectedText);
		setLinkURL(editorLinkData.linkURL ?? '');
	}, [props.visible]);

	// Updates the content of the CodeMirror editor based on internal state.
	const updateEditor = () => {
		props.editorControl.updateLink(linkLabel, linkURL);
	};

	const [styles, placeholderColor] = useMemo(() => {
		const theme = themeStyle(props.themeId);

		const styleSheet = StyleSheet.create({
			modalContent: {
				margin: 15,
				padding: 30,
				backgroundColor: theme.backgroundColor,

				elevation: 5,
				shadowOffset: {
					width: 1,
					height: 1,
				},
				shadowOpacity: 0.4,
				shadowRadius: 1,
			},
			button: {
				color: theme.color2,
				backgroundColor: theme.backgroundColor2,
			},
			text: {
				color: theme.color,
			},
			input: {
				color: theme.color,
			},
		});
		const placeholderColor = theme.colorFaded;
		return [styleSheet, placeholderColor];
	}, [props.themeId]);

	// See https://www.hingehealth.com/engineering-blog/accessible-react-native-textinput/
	// for more about creating accessible RN inputs.
	const linkTextInput = (
		<View accessible>
			<Text style={styles.text}>{_('Link Text')}</Text>
			<TextInput
				style={styles.input}
				placeholder={_('Description of the link')}
				placeholderTextColor={placeholderColor}
				value={linkLabel}
				onChangeText={(text: string) => setLinkLabel(text)}/>
		</View>
	);

	const linkURLInput = (
		<View accessible>
			<Text style={styles.text}>{_('URL')}</Text>
			<TextInput
				style={styles.input}
				placeholder={_('URL')}
				placeholderTextColor={placeholderColor}
				value={linkURL}
				autoCorrect={false}
				keyboardType="url"
				onChangeText={(text: string) => setLinkURL(text)}/>
		</View>
	);

	return (
		<Modal
			animationType="slide"
			transparent={true}
			visible={props.visible}
			onRequestClose={() => {
				props.editorControl.hideLinkDialog();
			}}>
			<View style={styles.modalContent}>
				<Text style={styles.text}>{_('Edit Link')}</Text>
				<View>
					{linkTextInput}
					{linkURLInput}
				</View>
				<Button
					style={styles.button}
					onPress={() => {
						updateEditor();
						props.editorControl.hideLinkDialog();
					}}
					title={_('Done')} />
			</View>
		</Modal>
	);
};

export default EditLinkDialog;

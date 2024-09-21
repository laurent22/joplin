// Dialog allowing the user to update/create links

const React = require('react');
const { useState, useEffect, useMemo, useRef } = require('react');
const { StyleSheet } = require('react-native');
const { View, Text, TextInput, Button } = require('react-native');

import Modal from '../Modal';
import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
import { EditorControl } from './types';
import { useCallback } from 'react';
import SelectionFormatting from '@joplin/editor/SelectionFormatting';
import { focus } from '@joplin/lib/utils/focusHandler';

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

	const linkInputRef = useRef();

	// Reset the label and URL when shown/hidden
	useEffect(() => {
		setLinkLabel(editorLinkData.linkText ?? props.selectionState.selectedText);
		setLinkURL(editorLinkData.linkURL ?? '');
	}, [
		props.visible, editorLinkData.linkText, props.selectionState.selectedText,
		editorLinkData.linkURL,
	]);

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
			header: {
				color: theme.color,
				fontSize: 22,
			},
			input: {
				color: theme.color,
				backgroundColor: theme.backgroundColor,

				minHeight: 48,
				borderBottomColor: theme.backgroundColor3,
				borderBottomWidth: 1,
			},
			inputContainer: {
				flexDirection: 'column',
				paddingBottom: 10,
			},
		});
		const placeholderColor = theme.colorFaded;
		return [styleSheet, placeholderColor];
	}, [props.themeId]);

	const onSubmit = useCallback(() => {
		props.editorControl.updateLink(linkLabel, linkURL);
		props.editorControl.hideLinkDialog();
	}, [props.editorControl, linkLabel, linkURL]);

	// See https://www.hingehealth.com/engineering-blog/accessible-react-native-textinput/
	// for more about creating accessible RN inputs.
	const linkTextInput = (
		<View style={styles.inputContainer} accessible>
			<Text style={styles.text}>{_('Link text')}</Text>
			<TextInput
				style={styles.input}
				placeholder={_('Link description')}
				placeholderTextColor={placeholderColor}
				value={linkLabel}

				returnKeyType="next"
				autoFocus

				onSubmitEditing={() => {
					focus('EditLinkDialog::onSubmitEditing', linkInputRef.current);
				}}
				onChangeText={(text: string) => setLinkLabel(text)}
			/>
		</View>
	);

	const linkURLInput = (
		<View style={styles.inputContainer} accessible>
			<Text style={styles.text}>{_('URL')}</Text>
			<TextInput
				style={styles.input}
				placeholder={_('URL')}
				placeholderTextColor={placeholderColor}
				value={linkURL}
				ref={linkInputRef}

				autoCorrect={false}
				autoCapitalize="none"
				keyboardType="url"
				textContentType="URL"
				returnKeyType="done"

				onSubmitEditing={onSubmit}
				onChangeText={(text: string) => setLinkURL(text)}
			/>
		</View>
	);

	return (
		<Modal
			animationType="fade"
			containerStyle={styles.modalContent}
			transparent={true}
			visible={props.visible}
			onRequestClose={() => {
				props.editorControl.hideLinkDialog();
			}}>
			<Text style={styles.header}>{_('Edit link')}</Text>
			<View>
				{linkTextInput}
				{linkURLInput}
			</View>
			<Button
				style={styles.button}
				onPress={onSubmit}
				title={_('Done')}
			/>
		</Modal>
	);
};

export default EditLinkDialog;

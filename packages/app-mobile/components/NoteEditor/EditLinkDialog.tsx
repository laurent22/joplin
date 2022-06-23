/**
 * Pop-up dialog for editing the content of a link.
 */

const React = require('react');
const { useState, useMemo } = require('react');
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
	const [linkLabel, setLinkLabel] = useState(
		editorLinkData.linkText ?? props.selectionState.selectedText
	);
	const [linkURL, setLinkURL] = useState(editorLinkData.linkURL ?? '');

	// Updates the content of the CodeMirror editor based on internal state.
	const updateEditor = () => {
		props.editorControl.updateLink(linkLabel, linkURL);
	};

	const styles = useMemo(() => {
		const theme = themeStyle(props.themeId);

		return StyleSheet.create({
			dialog: {
			},
			button: {
				color: theme.color2,
				backgroundColor: theme.backgroundColor2,
			},
		});
	}, [props.themeId]);

	// See https://www.hingehealth.com/engineering-blog/accessible-react-native-textinput/
	// for more about creating accessible RN inputs.
	const linkTextInput = (
		<View accessible>
			<Text>{_('Link Text')}</Text>
			<TextInput
				placeholder={_('Description of the link')}
				value={linkLabel}
				onChangeText={(text: string) => setLinkLabel(text)}/>
		</View>
	);

	const linkURLInput = (
		<View accessible>
			<Text>{_('URL')}</Text>
			<TextInput
				placeholder={_('URL')}
				value={linkURL}
				autoCorrect={false}
				onChangeText={(text: string) => setLinkURL(text)}/>
		</View>
	);

	return (
		<View>
			<Modal
				animationType="slide"
				transparent={true}
				visible={props.visible}
				onRequestClose={() => {
					props.editorControl.hideLinkDialog();
				}}>
				<View>
					<Text>{_('Edit Link')}</Text>
					<View>
						{ linkTextInput }
						{ linkURLInput }
					</View>
					<Button
						style={styles.button}
						onPress={() => {
							updateEditor();
							props.editorControl.hideLinkDialog();
						}}
						title={_('Done')}/>
				</View>
			</Modal>
		</View>
	);
};

export default EditLinkDialog;

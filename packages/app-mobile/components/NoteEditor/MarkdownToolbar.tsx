// A toolbar for the markdown editor.

const React = require('react');
const { StyleSheet } = require('react-native');
const { View, Text, TouchableHighlight } = require('react-native');
const { useMemo } = require('react');
import { themeStyle } from '@joplin/lib/theme';
import { _ } from '@joplin/lib/locale';
import { EditorControl, SelectionFormatting } from './EditorType';

interface ToolbarProps {
	editorControl: EditorControl;
	selectionState: SelectionFormatting;
	themeId: number;
}

interface ButtonProps {
	onPress: ()=> void;
	style: any;
	activated: boolean;
	accessibilityLabel: string;
	title: string;
}


const MarkdownToolbar = (props: ToolbarProps) => {
	const styles = useMemo(() => {
		const theme = themeStyle(props.themeId);

		return StyleSheet.create({
			button: {
				padding: 20,
				alignItems: 'center',
				backgroundColor: theme.backgroundColor4,
				color: theme.color4,
			},
			buttonActive: {
				backgroundColor: theme.backgroundColor3,
				color: theme.color3,
			},
			text: {
				color: theme.color4,
			},
			toolbar: {
				flex: 0,
				flexDirection: 'row',
				alignItems: 'baseline',
				justifyContent: 'center',
			},
		});
	}, [props.themeId]);

	const ToolbarButton = (props: ButtonProps) => {
		const activatedStyle = props.activated ? styles.buttonActive : {};

		return (
			<TouchableHighlight
				style={{ ...styles.button, ...props.style, ...activatedStyle }}
				onPress={props.onPress}
				accessibilityLabel={props.accessibilityLabel}>
				<Text style={{ ...styles.text, ...props.style }}>{props.title}</Text>
			</TouchableHighlight>
		);
	};

	return (
		<View
			style={styles.toolbar}>
			<ToolbarButton
				onPress={props.editorControl.toggleBolded}
				style={{ fontWeight: 'bold' }}
				activated={props.selectionState.bolded}
				title="B"
				accessibilityLabel={
					props.selectionState.bolded ? _('Un-bold') : _('Bold')
				}/>
			<ToolbarButton
				onPress={props.editorControl.toggleItalicized}
				style={{ fontStyle: 'italic' }}
				activated={props.selectionState.italicized}
				title="I"
				accessibilityLabel={
					props.selectionState.italicized ? _('Un-italicize') : _('Italicize')
				}/>
		</View>
	);
};

export default MarkdownToolbar;
export { MarkdownToolbar };

// A toolbar for the markdown editor.

const React = require('react');
const { StyleSheet } = require('react-native');
const { ScrollView, View, Text, TouchableHighlight } = require('react-native');
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
	style?: any;
	activated: boolean;
	accessibilityLabel: string;
	title?: string;
	children?: any;
}


const MarkdownToolbar = (props: ToolbarProps) => {
	const styles = useMemo(() => {
		const theme = themeStyle(props.themeId);

		return StyleSheet.create({
			button: {
				padding: 15,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: theme.backgroundColor4,
				color: theme.color4,
				aspectRatio: 1,
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
			toolbarContent: {
				flexGrow: 1,
				justifyContent: 'center',
			},
		});
	}, [props.themeId]);

	const ToolbarButton = (props: ButtonProps) => {
		const activatedStyle = props.activated ? styles.buttonActive : {};
		let content;

		if (props.children) {
			content = props.children;
		} else {
			content = (
				<Text style={{ ...styles.text, ...props.style }}>{props.title}</Text>
			);
		}

		return (
			<TouchableHighlight
				style={{ ...styles.button, ...(props.style ?? {}), ...activatedStyle }}
				onPress={props.onPress}
				accessibilityLabel={props.accessibilityLabel}>
				{ content }
			</TouchableHighlight>
		);
	};

	return (
		<View style={styles.toolbar}>
			<ScrollView contentContainerStyle={styles.toolbarContent} horizontal={true}>
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
				<ToolbarButton
					onPress={props.editorControl.toggleInlineCode}
					activated={props.selectionState.inInlineCode}
					title="{;}"
					accessibilityLabel={
						props.selectionState.inInlineCode ? _('End Inline Code') : _('Inline Code')
					}/>
				<ToolbarButton
					onPress={props.editorControl.toggleList}
					activated={props.selectionState.listLevel > 0}
					accessibilityLabel={
						props.selectionState.listLevel > 0 ? _('Remove list') : _('Add List')
					}>
					<Text
						style={{
							...styles.text,
							fontSize: 12,
							lineHeight: 6,
						}}>
						{'\n•—\n•—\n•—\n'}
					</Text>
				</ToolbarButton>
				<ToolbarButton
					onPress={() => props.editorControl.toggleHeaderLevel(1)}
					activated={props.selectionState.headerLevel == 1}
					title="H1"
					accessibilityLabel={
						props.selectionState.headerLevel == 1
							? _('Remove Header') : _('To level-1 header')
					}/>
				<ToolbarButton
					onPress={() => props.editorControl.toggleHeaderLevel(2)}
					activated={props.selectionState.headerLevel == 2}
					title="H2"
					accessibilityLabel={
						props.selectionState.headerLevel == 2
							? _('Remove Header') : _('To level-2 header')
					}/>
			</ScrollView>
		</View>
	);
};

export default MarkdownToolbar;
export { MarkdownToolbar };

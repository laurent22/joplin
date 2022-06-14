// /
// / A toolbar for the markdown editor.
// /

const React = require('react');
const { View, Button } = require('react-native');

interface Props {
	doBold: ()=> void;
	doItalicize: ()=> void;
}

const MarkdownToolbar = (props: Props) => {
	return (
		<View
			style={{
				flexDirection: 'row',
			}}>
			<Button
				onPress={props.doBold}
				title="B"
				accessibilityLabel="Bold"
			/>
			<Button
				onPress={props.doItalicize}
				title="I"
				accesibilityLabel="Italicize"
			/>
		</View>
	);
};

export default MarkdownToolbar;
export { MarkdownToolbar };

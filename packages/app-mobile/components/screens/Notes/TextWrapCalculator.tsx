import * as React from 'react';
import { Platform, Text, ViewStyle } from 'react-native';

interface Props {
	textCompStyle: ViewStyle;
	textCompContainerWidth: number; // Must be updated dynamically via onLayout of the container, in order for Text.onTextLayout to fire on every device rotation
	showMultilineToggle: boolean | null;
	multiline: boolean;
	text: string;
	updateState: (showMultilineToggle: boolean, multiline: boolean)=> void;
	readOnly: boolean;
}

// This component can be used to estimate when text wrapping is required for a TextInput or Text element, to conditionally display a button to enable / disable
// text wrapping, depending on whether the text is wide enough to require a toggle. Because the exact wrap point cannot be known precisely, this component uses
// an over-approximation when updating 'multiline' (which can be mapped to the driving component's multiline prop). This causes the toggle to appear only after
// wrapping has begun, avoiding early expansion and improving the editing experience.
// Even if already using a Text element, a separate hidden Text element must be used for text wrapping estimation, because if onTextLayout is used on a visible
// component, it prevents text highlighting from working.
const TextWrapCalculator: React.FC<Props> = props => {
	// Text values which are initially 0 or 1 characters in length do not trigger onTextLayout a second time after textCompContainerWidth has been set,
	// which may result in a component remount after entering the first character on the TextInput this is linked to, which will cause change or loss of focus.
	// Set the text to a dummy value of at least 2 characters when the titleContainerWidth is not yet measured, to ensure onTextLayout will fire a second time
	const text = props.textCompContainerWidth !== 0 ? props.text : 'abc';

	return Platform.OS === 'web' ? null : <Text
		pointerEvents='none'
		style={[
			props.textCompStyle,
			{
				position: 'absolute',
				opacity: 0,
				width: props.textCompContainerWidth,
			},
		]}
		onTextLayout={(e) => {
			if (props.textCompContainerWidth !== 0) {
				const numberOfLines = e.nativeEvent.lines.length;
				const showToggle = numberOfLines > 1;
				let enableMultiline;
				if (props.showMultilineToggle === null) {
					// Upon opening the screen, multiline should always be disabled, so long titles start collapsed and it does not open the keyboard automatically.
					// If the field is readonly, the keyboard opening is a non issue, and multiline should be enabled when not expandable to make text selectable
					enableMultiline = props.readOnly ? !showToggle : false;
				} else {
					// In every other case, retain the value of multiline so that it does not change while the user is typing, but only showMultilineToggle changes
					enableMultiline = props.multiline;
				}
				if (props.showMultilineToggle !== showToggle) {
					props.updateState(showToggle, enableMultiline);
				}
			}
		}}
	>
		{text}
	</Text>;
};

export default TextWrapCalculator;

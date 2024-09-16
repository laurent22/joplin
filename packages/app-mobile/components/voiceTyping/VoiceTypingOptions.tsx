import * as React from 'react';

import { _ } from '@joplin/lib/locale';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Switch, Text } from 'react-native-paper';
import { connect } from 'react-redux';
import { AppState } from '../../utils/types';
import { useId, useMemo } from 'react';
import TextButton, { ButtonType } from '../buttons/TextButton';
import Setting from '@joplin/lib/models/Setting';
import AddNewReplacement from './AddNewReplacement';

interface Props {
	replacementsEnabled: boolean;
	replacements: Record<string, string>;
}

const useStyles = (replacementsEnabled: boolean) => {
	return useMemo(() => {
		return StyleSheet.create({
			settingRow: {
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'space-between',
				flexWrap: 'wrap',
			},
			container: {
				flexGrow: 1,
			},
			existingReplacements: {
				marginTop: 30,
				marginBottom: 30,
				opacity: replacementsEnabled ? 1 : 0.5,
			},
		});
	}, [replacementsEnabled]);
};

const VoiceTypingOptions: React.FC<Props> = props => {
	const styles = useStyles(props.replacementsEnabled);

	const replacementComponents: React.ReactNode[] = [];
	for (const [replaces, action] of Object.entries(props.replacements)) {
		const inserts = action.match(/^insert:(.*)$/)?.[1];
		let content;
		if (inserts) {
			content = <Text>{_('When I say "%s", insert "%s".', replaces, inserts)}</Text>;
		} else if (action === 'uppercase') {
			content = <Text>{_('When I say "%s", capitalise the first letter in the next word.', replaces)}</Text>;
		} else {
			content = <Text>{`Unknown action for word: ${replaces}`}</Text>;
		}

		replacementComponents.push(
			<View key={`action-${replaces}`} style={styles.settingRow}>
				{content}
				<TextButton type={ButtonType.Delete} onPress={() => {
					const newReplacements = { ...props.replacements };
					delete newReplacements[replaces];
					Setting.setValue('voiceTyping.replacements.words', newReplacements);
				}}>{_('Remove')}</TextButton>
			</View>,
			<Divider key={`divider-${replaces}`}/>,
		);
	}

	const enableReplacementsId = useId();

	return (
		<ScrollView style={styles.container}>
			<Text variant='titleLarge'>{_('Voice typing options')}</Text>
			<Divider/>
			<View style={styles.settingRow}>
				<Text nativeID={enableReplacementsId}>{_('Enable replacements')}</Text>
				<Switch
					aria-labelledby={enableReplacementsId}
					value={props.replacementsEnabled}
					onValueChange={enabled => Setting.setValue('voiceTyping.replacements.enabled', enabled)}
				/>
			</View>
			<Divider/>
			<View style={styles.existingReplacements}>
				{...replacementComponents}
			</View>
			<AddNewReplacement/>
		</ScrollView>
	);
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		replacementsEnabled: state.settings['voiceTyping.replacements.enabled'],
		replacements: state.settings['voiceTyping.replacements.words'],
	};
})(VoiceTypingOptions);

import * as React from 'react';

import { useCallback, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import { View } from 'react-native';
import { Divider, RadioButton, Text, TextInput } from 'react-native-paper';
import { PrimaryButton } from '../buttons';
import Setting from '@joplin/lib/models/Setting';


interface Props {

}


const AddNewReplacement: React.FC<Props> = _props => {
	const [actionType, setActionType] = useState('insert');
	const [textToInsert, setTextToInsert] = useState('');
	const [replacementWord, setReplacementWord] = useState('');

	const onAddNewReplacement = useCallback(() => {
		const replacements = { ...Setting.value('voiceTyping.replacements.words') };
		replacements[replacementWord.toLowerCase()] = actionType === 'insert' ? `insert:${textToInsert}` : actionType;
		Setting.setValue('voiceTyping.replacements.words', replacements);

		setTextToInsert('');
		setReplacementWord('');
	}, [textToInsert, actionType, replacementWord]);

	return <View style={{ display: 'flex', flexDirection: 'column' }}>
		<Divider/>
		<Text variant='labelMedium'>{_('Add new:')}</Text>
		<Text>{_('When I say:')}</Text>
		<TextInput label={_('Replacement word')} value={replacementWord} onChangeText={setReplacementWord} />
		<View style={{ flexShrink: 0 }}>
			<RadioButton.Group onValueChange={setActionType} value={actionType}>
				<RadioButton.Item value='uppercase' label={_('Uppercase the start of the next word')}/>
				<RadioButton.Item value='insert' label={_('Insert text')}/>
			</RadioButton.Group>
		</View>
		{actionType === 'insert' ? (
			<TextInput label={_('Text to insert')} value={textToInsert} onChangeText={setTextToInsert} />
		) : null}
		<PrimaryButton onPress={onAddNewReplacement}>{_('Add')}</PrimaryButton>
	</View>;
};

export default AddNewReplacement;

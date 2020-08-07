import * as React from 'react';
import SearchBar from '../SearchBar/SearchBar';
import Button, { ButtonLevel } from '../Button/Button';
const styled = require('styled-components').default;

interface Props {
	themeId: number,
}

const StyledRoot = styled.div`
	width: 100%;
	height: 100px;
	display: flex;
	flex-direction: row;
`;

export default function NoteListControls(props:Props) {
	return (
		<StyledRoot>
			<SearchBar themeId={props.themeId}/>
			<Button themeId={props.themeId} iconName="icon-note" level={ButtonLevel.Primary}/>
			<Button themeId={props.themeId} iconName="far fa-check-square" level={ButtonLevel.Secondary}/>
		</StyledRoot>
	);
}

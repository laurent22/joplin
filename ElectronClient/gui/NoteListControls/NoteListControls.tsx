import * as React from 'react';
import SearchBar from '../SearchBar/SearchBar';
import Button, { ButtonLevel } from '../Button/Button';
const styled = require('styled-components').default;

const StyledRoot = styled.div`
	width: 100%;
	height: 100px;
	display: flex;
	flex-direction: row;
`;

export default function NoteListControls() {
	return (
		<StyledRoot>
			<SearchBar/>
			<Button iconName="icon-note" level={ButtonLevel.Primary}/>
			<Button iconName="far fa-check-square" level={ButtonLevel.Secondary}/>
		</StyledRoot>
	);
}

import * as React from 'react';
import SearchBar from '../SearchBar/SearchBar';
const styled = require('styled-components').default;

interface Props {
	themeId: number,
}

const StyledRoot = styled.div`
	width: 100%;
	height: 100px;
`;

export default function NoteListControls(props:Props) {
	return (
		<StyledRoot>
			<SearchBar themeId={props.themeId}/>
		</StyledRoot>
	);
}

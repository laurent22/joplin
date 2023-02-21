import * as React from 'react';
import { useMemo } from 'react';
import NoteList from '../NoteList/NoteList';
import NoteListControls from '../NoteListControls/NoteListControls';
import { Size } from '../ResizableLayout/utils/types';
import styled from 'styled-components';

interface Props {
	resizableLayoutEventEmitter: any;
	size: Size;
	visible: boolean;
	themeId: number;
}

const StyledRoot = styled.div`
	display: flex;
	flex-direction: column;
	overflow: hidden;
	width: 100%;
`;

export default function NoteListWrapper(props: Props) {
	const noteListSize = useMemo(() => {
		return {
			width: props.size.width,
			height: props.size.height,
		};
	}, [props.size]);

	return (
		<StyledRoot>
			<NoteListControls />
			<NoteList resizableLayoutEventEmitter={props.resizableLayoutEventEmitter} size={noteListSize} visible={props.visible}/>
		</StyledRoot>
	);
}

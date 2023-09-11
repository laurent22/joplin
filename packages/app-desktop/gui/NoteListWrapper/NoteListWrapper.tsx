import { themeStyle } from '@joplin/lib/theme';
import * as React from 'react';
import { useMemo, useState } from 'react';
// import NoteList from '../NoteList/NoteList';
import NoteList2 from '../NoteList/NoteList2';
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
	const theme = themeStyle(props.themeId);
	const [controlHeight, setControlHeight] = useState(theme.topRowHeight);

	const onContentHeightChange = (sameRow: boolean) => {
		if (sameRow) {
			setControlHeight(theme.topRowHeight);
		} else {
			setControlHeight(theme.topRowHeight * 2);
		}
	};

	const noteListSize = useMemo(() => {
		return {
			width: props.size.width,
			height: props.size.height,
		};
	}, [props.size, controlHeight]);

	// <NoteList resizableLayoutEventEmitter={props.resizableLayoutEventEmitter} size={noteListSize} visible={props.visible}/>

	return (
		<StyledRoot>
			<NoteListControls height={controlHeight} width={noteListSize.width} onContentHeightChange={onContentHeightChange}/>
			<NoteList2 resizableLayoutEventEmitter={props.resizableLayoutEventEmitter} size={noteListSize} visible={props.visible}/>
		</StyledRoot>
	);
}

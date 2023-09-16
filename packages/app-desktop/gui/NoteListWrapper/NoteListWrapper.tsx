import { themeStyle } from '@joplin/lib/theme';
import * as React from 'react';
import { useMemo, useState } from 'react';
import NoteList2 from '../NoteList/NoteList2';
import NoteListControls from '../NoteListControls/NoteListControls';
import { Size } from '../ResizableLayout/utils/types';
import styled from 'styled-components';
import { getDefaultListRenderer, getListRendererById } from '@joplin/lib/services/noteList/renderers';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('NoteListWrapper');

interface Props {
	resizableLayoutEventEmitter: any;
	size: Size;
	visible: boolean;
	themeId: number;
	listRendererId: string;
	startupPluginsLoaded: boolean;
}

const StyledRoot = styled.div`
	display: flex;
	flex-direction: column;
	overflow: hidden;
	width: 100%;
`;

// If the renderer ID that was saved to settings is already registered, we
// return it. If not, we need to wait for all plugins to be loaded, because one
// of them will most likely register the renderer we need. If none of them do,
// we use a default renderer instead of throwing an error.
const useListRenderer = (listRendererId: string, startupPluginsLoaded: boolean) => {
	const listRenderer = getListRendererById(listRendererId);
	if (listRenderer) return listRenderer;
	if (startupPluginsLoaded) {
		logger.error(`Tried to load renderer "${listRendererId}" but none of the registered renderers match this ID - using default renderer instead`);
		return getDefaultListRenderer();
	}
	return null;
};

export default function NoteListWrapper(props: Props) {
	const theme = themeStyle(props.themeId);
	const [controlHeight, setControlHeight] = useState(theme.topRowHeight);
	const listRenderer = useListRenderer(props.listRendererId, props.startupPluginsLoaded);

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
			height: props.size.height - controlHeight,
		};
	}, [props.size, controlHeight]);

	const renderNoteList = () => {
		if (!listRenderer) return null;
		return <NoteList2
			listRenderer={listRenderer}
			resizableLayoutEventEmitter={props.resizableLayoutEventEmitter}
			size={noteListSize}
			visible={props.visible}
		/>;
	};

	return (
		<StyledRoot>
			<NoteListControls height={controlHeight} width={noteListSize.width} onContentHeightChange={onContentHeightChange}/>
			{renderNoteList()}
		</StyledRoot>
	);
}

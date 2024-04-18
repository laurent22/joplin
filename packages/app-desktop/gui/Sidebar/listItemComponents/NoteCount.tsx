import * as React from 'react';
import { StyledNoteCount } from '../styles';


interface Props {
	count: number;
}

const NoteCount: React.FC<Props> = props => {
	const count = props.count;
	return count ? <StyledNoteCount className="note-count-label">{count}</StyledNoteCount> : null;
};

export default NoteCount;

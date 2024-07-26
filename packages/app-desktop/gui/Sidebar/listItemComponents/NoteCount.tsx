import * as React from 'react';
import { _n } from '@joplin/lib/locale';


interface Props {
	count: number;
}

const NoteCount: React.FC<Props> = props => {
	const count = props.count;
	const title = _n('Contains %d note', 'Contains %d notes', count, count);
	return count ? <div role='note' aria-label={title} title={title} className="note-count-label">{count}</div> : null;
};

export default NoteCount;

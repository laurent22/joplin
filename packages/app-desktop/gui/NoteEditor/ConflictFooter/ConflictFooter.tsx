import * as React from 'react';
import { _ } from '@joplin/lib/locale';

interface Props {
	onFinish: ()=> void;
	disabled: boolean;
}

const ConflictFooter: React.FC<Props> = ({ onFinish, disabled }) => {
	return (
		<div className='conflict-footer'>
			<button className='-finish' onClick={onFinish} disabled={disabled}>{_('Finish')}</button>
		</div>
	);
};

export default ConflictFooter;

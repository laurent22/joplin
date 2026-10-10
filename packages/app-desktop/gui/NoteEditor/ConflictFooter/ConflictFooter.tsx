import * as React from 'react';
import { _ } from '@joplin/lib/locale';

interface Props {
	onFinish: ()=> void;
	onKeepBoth: ()=> void;
	onGoToConflict: (direction: 'previous'|'next')=> void;
	disabled: boolean;
}

const ConflictFooter: React.FC<Props> = ({ onFinish, onKeepBoth, onGoToConflict, disabled }) => {
	const onPrevious = React.useCallback(() => onGoToConflict('previous'), [onGoToConflict]);
	const onNext = React.useCallback(() => onGoToConflict('next'), [onGoToConflict]);

	return (
		<div className='conflict-footer'>
			<div className='-navigation'>
				<button className='-step' onClick={onPrevious}>
					<i className='fas fa-chevron-left'></i>
					<span>{_('Previous change')}</span>
				</button>
				<button className='-step' onClick={onNext}>
					<span>{_('Next change')}</span>
					<i className='fas fa-chevron-right'></i>
				</button>
			</div>
			<button className='-keep-both' onClick={onKeepBoth} disabled={disabled}>{_('Keep both versions')}</button>
			<button className='-finish' onClick={onFinish} disabled={disabled}>{_('Finish')}</button>
		</div>
	);
};

export default ConflictFooter;

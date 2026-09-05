import * as React from 'react';
import { ChangeEvent, ReactNode, useCallback } from 'react';
import { _ } from '@joplin/lib/locale';

interface Props {
	// Null when the two versions agree on the title
	conflictTitle: string|null;
	disabled: boolean;
	resolvedTitle: string;
	onResolvedTitleChange: (title: string)=> void;
	infoGroup: ReactNode;
	// Shown in place of the two boxes when only the body is in conflict
	titleInput: ReactNode;
	onHelp?: ()=> void;
}

// The heading shown above every conflict note. Differing titles replace the
// title input with the two versions
const ConflictTitle: React.FC<Props> = ({ conflictTitle, disabled, resolvedTitle, onResolvedTitleChange, infoGroup, titleInput, onHelp }) => {
	const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		onResolvedTitleChange(event.target.value);
	}, [onResolvedTitleChange]);

	const onCopy = useCallback(() => {
		onResolvedTitleChange(conflictTitle);
	}, [conflictTitle, onResolvedTitleChange]);

	const hasTitleConflict = conflictTitle !== null;

	return (
		<div className='conflict-title'>
			<div className='-header'>
				<h1 className='-title'>{_('Resolve Conflicts')}</h1>
				{infoGroup}
			</div>

			<div className='-subheader'>
				<div className='-instructions'>
					<div className='-instructions-title'>{_('Review the highlighted changes below')}</div>
					<div className='-instructions-detail'>{_('You\'re reviewing changes between your copy of this note and the latest saved version')}</div>
				</div>
				{onHelp ? (
					<button className='-help' onClick={onHelp}>
						<i className='fas fa-question-circle'></i>
						<span>{_('Help')}</span>
					</button>
				) : null}
			</div>

			{hasTitleConflict ? (
				<div className='-versions'>
					<label className='-field'>
						<span className='-label'>{_('Conflict note title')}</span>
						<input className='-input -readonly' type='text' value={conflictTitle} readOnly={true} />
					</label>

					<button
						className='-copy'
						onClick={onCopy}
						disabled={disabled}
						title={_('Use this title')}
						aria-label={_('Use this title')}
					><i className='fas fa-arrow-right'></i></button>

					<label className='-field'>
						<span className='-label'>{_('Resolved note title')}</span>
						<input className='-input' type='text' value={resolvedTitle} onChange={onChange} readOnly={disabled} />
					</label>
				</div>
			) : (
				<div className='-single-title'>{titleInput}</div>
			)}
		</div>
	);
};

export default ConflictTitle;

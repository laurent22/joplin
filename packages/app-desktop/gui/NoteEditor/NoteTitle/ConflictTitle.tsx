import * as React from 'react';
import { ChangeEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	// Null when the two versions agree on the title
	conflictTitle: string|null;
	disabled: boolean;
	resolvedTitle: string;
	onResolvedTitleChange: (title: string)=> void;
	infoGroup: ReactNode;
	// Shown in place of the two boxes when only the body is in conflict
	titleInput: ReactNode;
}

// The heading shown above every conflict note. Differing titles replace the
// title input with the two versions
const ConflictTitle: React.FC<Props> = ({ conflictTitle, disabled, resolvedTitle, onResolvedTitleChange, infoGroup, titleInput }) => {
	const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		onResolvedTitleChange(event.target.value);
	}, [onResolvedTitleChange]);

	const resolvedInputRef = useRef<HTMLInputElement>(null);
	const [helpVisible, setHelpVisible] = useState(false);
	const toggleHelp = useCallback(() => setHelpVisible(visible => !visible), []);
	const closeHelp = useCallback(() => setHelpVisible(false), []);
	const helpRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!helpVisible) return () => {};

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') closeHelp();
		};
		const onPointerDown = (event: PointerEvent) => {
			if (!helpRef.current?.contains(event.target as Node)) closeHelp();
		};

		const doc = helpRef.current?.ownerDocument ?? document;
		doc.addEventListener('keydown', onKeyDown);
		doc.addEventListener('pointerdown', onPointerDown);
		return () => {
			doc.removeEventListener('keydown', onKeyDown);
			doc.removeEventListener('pointerdown', onPointerDown);
		};
	}, [helpVisible, closeHelp]);

	const onCopy = useCallback(() => {
		const input = resolvedInputRef.current;

		if (input && document.execCommand) {
			focus('ConflictTitle::useThisTitle', input);
			input.select();
			if (document.execCommand('insertText', false, conflictTitle)) return;
		}

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
					<div className='-instructions-detail'>{_('You\'re reviewing changes between your copy of this note and the latest synced version')}</div>
				</div>
				<div className='-help-anchor' ref={helpRef}>
					<button className='-help' onClick={toggleHelp} aria-expanded={helpVisible}>
						<i className='fas fa-question-circle'></i>
						<span>{_('Help')}</span>
					</button>

					{helpVisible ? (
						<div className='-help-popover' role='dialog' aria-label={_('How conflict resolution works')}>
							<div className='-help-header'>
								<span className='-help-title'>{_('How conflict resolution works')}</span>
								<button className='-help-close' onClick={closeHelp} aria-label={_('Close')}>
									<i className='fas fa-times'></i>
								</button>
							</div>

							<p><span className='-swatch -incoming'></span>{_('Blue is the version from your other device. You can edit it directly.')}</p>
							<p><span className='-swatch -local'></span>{_('Yellow is your version of those lines. Click "Use my version" to keep it.')}</p>
							<p>{_('Darker highlights show the words that differ.')}</p>

							{hasTitleConflict ? (
								<p className='-help-section'>{_('The title was changed too. The box on the right is the title that will be saved - edit it, or click the arrow to use the one on the left.')}</p>
							) : null}

							<p className='-help-section'>{_('Blue text is kept by default. Click "Finish" to save.')}</p>
							<p>{_('To keep both, click "Keep both versions" instead.')}</p>
						</div>
					) : null}
				</div>
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
						<input className='-input' type='text' ref={resolvedInputRef} value={resolvedTitle} onChange={onChange} readOnly={disabled} />
					</label>
				</div>
			) : (
				<div className='-single-title'>{titleInput}</div>
			)}
		</div>
	);
};

export default ConflictTitle;

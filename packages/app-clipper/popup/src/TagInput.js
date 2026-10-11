import React, { useEffect, useId, useRef, useState } from 'react';

const compareTags = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const isSameTag = (a, b) => a.toLowerCase() === b.toLowerCase();

const TagInput = ({ allTags, selectedTags, onChange }) => {
	const id = useId();
	const inputRef = useRef(null);
	const [query, setQuery] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);

	const trimmedQuery = query.trim();
	const isSelected = title => selectedTags.some(tag => isSameTag(tag, title));
	const canCreate = trimmedQuery !== '' && !isSelected(trimmedQuery) && !allTags.some(tag => isSameTag(tag, trimmedQuery));

	const options = [
		...allTags
			.filter(tag => !isSelected(tag) && tag.toLowerCase().includes(trimmedQuery.toLowerCase()))
			.sort(compareTags)
			.map(title => ({ title, isNew: false })),
		...(canCreate ? [{ title: trimmedQuery, isNew: true }] : []),
	];
	const currentIndex = Math.min(activeIndex, options.length - 1);

	useEffect(() => {
		if (!isOpen) return;
		document.getElementById(`${id}-option-${currentIndex}`)?.scrollIntoView({ block: 'nearest' });
	}, [isOpen, currentIndex, id]);

	const addTag = (title) => {
		if (!isSelected(title)) onChange([...selectedTags, title].sort(compareTags));
		setQuery('');
		setActiveIndex(0);
		setIsOpen(true);
	};

	const removeTag = (title) => {
		onChange(selectedTags.filter(tag => tag !== title));
		inputRef.current?.focus();
	};

	const removeAllTags = () => {
		onChange([]);
		inputRef.current?.focus();
	};

	const input_keyDown = (event) => {
		switch (event.key) {
		case 'ArrowDown':
			event.preventDefault();
			if (isOpen) setActiveIndex(Math.min(currentIndex + 1, options.length - 1));
			else setIsOpen(true);
			break;
		case 'ArrowUp':
			event.preventDefault();
			if (isOpen) setActiveIndex(Math.max(currentIndex - 1, 0));
			break;
		case 'Enter':
			if (isOpen && options[currentIndex]) {
				event.preventDefault();
				addTag(options[currentIndex].title);
			}
			break;
		case 'Escape':
			if (isOpen) {
				event.preventDefault();
				setIsOpen(false);
			}
			break;
		case 'Backspace':
			if (!query && selectedTags.length) onChange(selectedTags.slice(0, -1));
			break;
		}
	};

	const input_change = (event) => {
		// Tags are sent to Joplin as a comma separated list, so a comma cannot be part of a title.
		setQuery(event.target.value.replace(/,/g, ''));
		setActiveIndex(0);
		setIsOpen(true);
	};

	return (
		<div className="Tags">
			<div className="TagInputSide">
				<label htmlFor={`${id}-input`}>Tags</label>
				<button
					type="button"
					className="TagInputClear"
					tabIndex={-1}
					disabled={!selectedTags.length}
					title="Remove all tags"
					aria-label="Remove all tags"
					onClick={removeAllTags}
				>
					<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
						<path fill="currentColor" d="M6 1h4l.5 1H14v1.5H2V2h3.5L6 1zM3.5 5h9l-.7 9.2a1 1 0 0 1-1 .8H5.2a1 1 0 0 1-1-.8L3.5 5zm2.3 1.5v6.5h1.2V6.5H5.8zm3.2 0v6.5h1.2V6.5H9z"/>
					</svg>
				</button>
			</div>
			<div className="TagInput">
				<div className="TagInputField" onClick={() => inputRef.current?.focus()}>
					{selectedTags.map(tag => (
						<span key={tag} className="TagChip">
							<span className="TagChipTitle">{tag}</span>
							<button type="button" tabIndex={-1} aria-label={`Remove tag ${tag}`} onClick={() => removeTag(tag)}>×</button>
						</span>
					))}
					<input
						id={`${id}-input`}
						ref={inputRef}
						type="text"
						role="combobox"
						autoComplete="off"
						aria-autocomplete="list"
						aria-expanded={isOpen && options.length > 0}
						aria-controls={`${id}-list`}
						aria-activedescendant={isOpen && options.length > 0 ? `${id}-option-${currentIndex}` : undefined}
						value={query}
						onChange={input_change}
						onKeyDown={input_keyDown}
						onFocus={() => setIsOpen(true)}
						onClick={() => setIsOpen(true)}
						onBlur={() => setIsOpen(false)}
					/>
				</div>
				{isOpen && options.length > 0 && (
					<ul className="TagInputOptions" id={`${id}-list`} role="listbox" aria-label="Matching tags">
						{options.map((option, index) => (
							<li
								key={option.isNew ? `new:${option.title}` : option.title}
								id={`${id}-option-${index}`}
								role="option"
								aria-selected={index === currentIndex}
								className={`${index === currentIndex ? 'Active' : ''} ${option.isNew ? 'New' : ''}`}
								// Keeps the focus in the input, otherwise the blur would close the list before the click.
								onMouseDown={event => event.preventDefault()}
								onMouseMove={() => setActiveIndex(index)}
								onClick={() => addTag(option.title)}
							>
								{option.isNew ? `Create "${option.title}"` : option.title}
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};

export default TagInput;

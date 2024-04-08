import React = require('react');
import { useMemo, useState, useCallback, CSSProperties, useEffect } from 'react';
import { _ } from '@joplin/lib/locale';

interface Props {
	type: string;
	style: CSSProperties;
	value: string;
	fonts: string[];
	onChange: (font: string)=> void;
}

const FontSearch = (props: Props) => {
	const { type, style, value, fonts, onChange } = props;
	const [inputText, setInputText] = useState(value);
	const [showList, setShowList] = useState(false);
	const [isListHovered, setIsListHovered] = useState(false);
	const [isFontSelected, setIsFontSelected] = useState(value !== '');
	const [renderedFonts, setRenderedFonts] = useState<string[]>([]);
	const areFontsLoading = renderedFonts.length === 0;

	const filteredFonts = useMemo(() => {
		if (isFontSelected) return fonts;
		return fonts.filter((font: string) =>
			font.toLowerCase().startsWith(inputText.toLowerCase()),
		);
	}, [fonts, inputText, isFontSelected]);

	useEffect(() => {
		setRenderedFonts(filteredFonts.slice(0, 20));
	}, [filteredFonts]);

	// Lazy loading
	const onListScroll: React.UIEventHandler<HTMLDivElement> = useCallback((event) => {
		const scrollTop = (event.target as HTMLDivElement).scrollTop;
		const scrollHeight = (event.target as HTMLDivElement).scrollHeight;
		const clientHeight = (event.target as HTMLDivElement).clientHeight;

		// Check if the user has scrolled to the bottom of the container
		// A small buffer of 20 pixels is subtracted from the total scrollHeight to ensure new content starts loading slightly before the user reaches the absolute bottom, providing a smoother experience.
		if (scrollTop + clientHeight >= scrollHeight - 20) {
			// Load the next 20 fonts
			const remainingFonts = filteredFonts.slice(renderedFonts.length, renderedFonts.length + 20);

			setRenderedFonts([...renderedFonts, ...remainingFonts]);
		}
	}, [filteredFonts, renderedFonts]);

	const onTextChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
		setIsFontSelected(false);
		setInputText(event.target.value);
		onChange(event.target.value);
	}, [onChange]);

	const onFocusHandle: React.FocusEventHandler<HTMLInputElement> = useCallback(() => setShowList(true), []);

	const onBlurHandle: React.FocusEventHandler<HTMLInputElement> = useCallback(() => {
		if (!isListHovered) {
			setShowList(false);
		}
	}, [isListHovered]);

	const onFontClick: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
		const font = (event.target as HTMLDivElement).innerText;
		setInputText(font);
		setShowList(false);
		onChange(font);
		setIsFontSelected(true);
	}, [onChange]);

	const onListHover: React.MouseEventHandler<HTMLDivElement> = useCallback(() => setIsListHovered(true), []);

	const onListLeave: React.MouseEventHandler<HTMLDivElement> = useCallback(() => setIsListHovered(false), []);

	return (
		<>
			<input
				type={type}
				style={style}
				value={inputText}
				onChange={onTextChange}
				onFocus={onFocusHandle}
				onBlur={onBlurHandle}
				spellCheck={false}
			/>
			<div
				className={'font-search-list'}
				style={{ display: showList ? 'block' : 'none' }}
				onMouseEnter={onListHover}
				onMouseLeave={onListLeave}
				onScroll={onListScroll}
			>
				{
					areFontsLoading ? <div>{_('Loading...')}</div> :
						renderedFonts.map((font: string) =>
							<div
								key={font}
								style={{ fontFamily: `"${font}"` }}
								onClick={onFontClick}
								className='font-search-item'
							>
								{font}
							</div>,
						)
				}
			</div>
		</>
	);
};

export default FontSearch;

import React = require('react');
import { useMemo, useState, useCallback, CSSProperties } from 'react';

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
	const areFontsLoading = fonts.length === 0;

	const filteredFonts = useMemo(() => {
		return fonts.filter((font: string) =>
			font.toLowerCase().startsWith(inputText.toLowerCase()),
		);
	}, [fonts, inputText]);

	const onTextChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
		setInputText(event.target.value);
		onChange(event.target.value);
	}, [onChange]);

	const onFocusHandle = useCallback(() => setShowList(true), []);

	const onBlurHandle = useCallback(() =>
		setTimeout(() => setShowList(false), 150) // Delay the hiding of the list to allow the click event to fire
	, []);

	const onFontClick: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
		const font = (event.target as HTMLDivElement).innerText;
		setInputText(font);
		setShowList(false);
		onChange(font);
	}, [onChange]);

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
			<div className={'font-search-list'} style={{ display: showList ? 'block' : 'none' }}>
				{
					areFontsLoading ? <div>Loading...</div> :
						filteredFonts.map((font: string) =>
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

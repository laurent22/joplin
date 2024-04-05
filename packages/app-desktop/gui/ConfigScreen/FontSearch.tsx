import React = require('react');
import { useMemo, useState, useCallback, CSSProperties } from 'react';

interface Props {
	_key: string;
	updateSettingValue: (key: string, value: string)=> void;
	type: string;
	style: CSSProperties;
	value: string;
	fonts: string[];
}

const FontSearch = (props: Props) => {
	const { _key: key, updateSettingValue, type, style, value, fonts } = props;
	const [inputText, setInputText] = useState(value);
	const [showList, setShowList] = useState(false);
	const areFontsLoading = fonts.length === 0;

	const filteredFonts = useMemo(() => {
		return fonts.filter((font: string) =>
			font.toLowerCase().startsWith(inputText.toLowerCase()),
		);
	}, [fonts, inputText]);

	const onTextChange = useCallback((event: any) => {
		setInputText(event.target.value);
		setShowList(true);
		updateSettingValue(key, event.target.value);
	}, [key, updateSettingValue]);

	const onFocusHandle = useCallback(() => setShowList(true), []);

	const onBlurHandle = useCallback(() =>
		setTimeout(() => setShowList(false), 150) // Delay the hiding of the list to allow the click event to fire
	, []);

	const onFontClick = useCallback((event: any) => {
		const font = event.target.innerText;
		setInputText(font);
		setShowList(false);
		updateSettingValue(key, font);
	}, [key, updateSettingValue]);

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

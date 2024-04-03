import React = require('react');
import { useMemo, useState, useCallback, memo } from 'react';
import { CSSProperties } from 'styled-components';

interface Props {
	_key: string;
	updateSettingValue: (key: string, value: string)=> void;
	inputType: string;
	inputStyle: CSSProperties;
	fieldValue: string;
	fonts: string[];
}

const FontSearch = (props: Props) => {
	const { _key: key, updateSettingValue, inputType, inputStyle, fieldValue, fonts } = props;
	const [inputText, setInputText] = useState('');
	const areFontsLoading = fonts.length === 0;

	const filteredFonts = useMemo(() => {
		return fonts.filter((font: string) =>
			font.toLowerCase().startsWith(inputText.toLowerCase()),
		);
	}, [fonts, inputText]);

	const showList = useCallback((display: boolean) => {
		document.getElementById(`search-list-${key}`).style.display = display ? 'block' : 'none';
	}, [key]);

	const onTextChange = useCallback((event: any) => {
		setInputText(event.target.value);
		updateSettingValue(key, event.target.value);
		showList(true);
	}, [key, updateSettingValue, showList]);

	const onFocusHandle = useCallback((event: any) => {
		setInputText(event.target.value); // To handle the case when the value is already set
		showList(true);
	}, [showList]);

	const onBlurHandle = useCallback(() =>
		setTimeout(() => showList(false), 150) // Delay the hiding of the list to allow the click event to fire
	, [showList]);

	const onFontClick = useCallback((event: any) => {
		const font = event.target.innerText;
		(document.getElementById(key) as HTMLDivElement).innerText = font;
		updateSettingValue(key, font);
		showList(false);
	}, [key, updateSettingValue, showList]);

	return (
		<>
			<input
				type={inputType}
				style={inputStyle}
				value={fieldValue}
				id={key}
				onChange={onTextChange}
				onFocus={onFocusHandle}
				onBlur={onBlurHandle}
				spellCheck={false}
			/>
			<div className={'font-search-list'} id={`search-list-${key}`} >
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

export default memo(FontSearch);

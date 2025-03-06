import * as React from 'react';
import { useState, useCallback, CSSProperties, useEffect } from 'react';
import { _ } from '@joplin/lib/locale';
import { SettingItemSubType } from '@joplin/lib/models/Setting';
import InlineCombobox from '../../InlineCombobox';

interface Props {
	type: string;
	style: CSSProperties;
	value: string;
	availableFonts: string[];
	inputId: string;
	onChange: (font: string)=> void;
	subtype: string;
}

const FontSearch = (props: Props) => {
	const { type, style, value, availableFonts, onChange, subtype } = props;
	const [filteredAvailableFonts, setFilteredAvailableFonts] = useState(availableFonts);
	const [isMonoBoxChecked, setIsMonoBoxChecked] = useState(false);
	const isLoadingFonts = filteredAvailableFonts.length === 0;

	useEffect(() => {
		if (subtype === SettingItemSubType.MonospaceFontFamily) {
			setIsMonoBoxChecked(true);
		}
	}, [subtype]);

	useEffect(() => {
		if (!isMonoBoxChecked) return setFilteredAvailableFonts(availableFonts);
		const localMonospacedFonts = availableFonts.filter((font: string) =>
			monospaceKeywords.some((word: string) => font.toLowerCase().includes(word)) ||
			knownMonospacedFonts.includes(font.toLowerCase()),
		);
		setFilteredAvailableFonts(localMonospacedFonts);
	}, [isMonoBoxChecked, availableFonts]);

	const handleMonoBoxCheck: React.ChangeEventHandler<HTMLInputElement> = useCallback(() => {
		setIsMonoBoxChecked(!isMonoBoxChecked);
	}, [isMonoBoxChecked]);

	const comboboxControls = <>
		{isLoadingFonts ? _('Loading...') : null}
		<div className='monospace-checkbox'>
			<input
				type='checkbox'
				checked={isMonoBoxChecked}
				onChange={handleMonoBoxCheck}
				id={`show-monospace-fonts_${subtype}`}
			/>
			<label htmlFor={`show-monospace-fonts_${subtype}`}>{_('Show monospace fonts only.')}</label>
		</div>
	</>;

	return (
		<InlineCombobox
			inputType={type}
			inputStyle={style}
			value={value}
			suggestedValues={filteredAvailableFonts}
			renderOption={font => <span style={{ fontFamily: font }}>{font}</span>}
			controls={comboboxControls}
			onChange={onChange}
			inputId={props.inputId}
		/>
	);
};

export default FontSearch;

// Known monospaced fonts from wikipedia
// https://en.wikipedia.org/wiki/List_of_monospaced_typefaces
// https://en.wikipedia.org/wiki/Category:Monospaced_typefaces
// Make sure to add the fonts in lower case
// cSpell:disable
const knownMonospacedFonts = [
	'andalé mono',
	'anonymous pro',
	'bitstream vera sans mono',
	'cascadia code',
	'century schoolbook monospace',
	'comic mono',
	'computer modern mono/typewriter',
	'consolas',
	'courier',
	'courier final draft',
	'courier new',
	'courier prime',
	'courier screenplay',
	'cousine',
	'dejavu sans mono',
	'droid sans mono',
	'envy code r',
	'everson mono',
	'fantasque sans mono',
	'fira code',
	'fira mono',
	'fixed',
	'fixedsys',
	'freemono',
	'go mono',
	'hack',
	'hyperfont',
	'ibm courier',
	'ibm plex mono',
	'inconsolata',
	'input',
	'iosevka',
	'jetbrains mono',
	'juliamono',
	'letter gothic',
	'liberation mono',
	'lucida console',
	'menlo',
	'monaco',
	'monofur',
	'monospace (unicode)',
	'nimbus mono l',
	'nk57 monospace',
	'noto mono',
	'ocr-a',
	'ocr-b',
	'operator mono',
	'overpass mono',
	'oxygen mono',
	'pragmatapro',
	'profont',
	'pt mono',
	'recursive mono',
	'roboto mono',
	'sf mono',
	'source code pro',
	'spleen',
	'terminal',
	'terminus',
	'tex gyre cursor',
	'ubuntu mono',
	'victor mono',
	'wumpus mono',
];

const monospaceKeywords = [
	'mono',
	'code',
	'courier',
	'console',
	'source code',
	'terminal',
	'fixed',
];

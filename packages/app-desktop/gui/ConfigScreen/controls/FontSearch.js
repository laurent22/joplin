"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const react_1 = require("react");
const locale_1 = require("@joplin/lib/locale");
const Setting_1 = require("@joplin/lib/models/Setting");
const InlineCombobox_1 = require("../../InlineCombobox");
const FontSearch = (props) => {
    const { type, style, value, availableFonts, onChange, subtype } = props;
    const [filteredAvailableFonts, setFilteredAvailableFonts] = (0, react_1.useState)(availableFonts);
    const [isMonoBoxChecked, setIsMonoBoxChecked] = (0, react_1.useState)(false);
    const isLoadingFonts = filteredAvailableFonts.length === 0;
    (0, react_1.useEffect)(() => {
        if (subtype === Setting_1.SettingItemSubType.MonospaceFontFamily) {
            setIsMonoBoxChecked(true);
        }
    }, [subtype]);
    (0, react_1.useEffect)(() => {
        if (!isMonoBoxChecked)
            return setFilteredAvailableFonts(availableFonts);
        const localMonospacedFonts = availableFonts.filter((font) => monospaceKeywords.some((word) => font.toLowerCase().includes(word)) ||
            knownMonospacedFonts.includes(font.toLowerCase()));
        setFilteredAvailableFonts(localMonospacedFonts);
    }, [isMonoBoxChecked, availableFonts]);
    const handleMonoBoxCheck = (0, react_1.useCallback)(() => {
        setIsMonoBoxChecked(!isMonoBoxChecked);
    }, [isMonoBoxChecked]);
    const comboboxControls = React.createElement(React.Fragment, null,
        isLoadingFonts ? (0, locale_1._)('Loading...') : null,
        React.createElement("div", { className: 'monospace-checkbox' },
            React.createElement("input", { type: 'checkbox', checked: isMonoBoxChecked, onChange: handleMonoBoxCheck, id: `show-monospace-fonts_${subtype}` }),
            React.createElement("label", { htmlFor: `show-monospace-fonts_${subtype}` }, (0, locale_1._)('Show monospace fonts only.'))));
    return (React.createElement(InlineCombobox_1.default, { inputType: type, inputStyle: style, value: value, suggestedValues: filteredAvailableFonts, renderOption: font => React.createElement("span", { style: { fontFamily: font } }, font), controls: comboboxControls, onChange: onChange, inputId: props.inputId }));
};
exports.default = FontSearch;
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
//# sourceMappingURL=FontSearch.js.map
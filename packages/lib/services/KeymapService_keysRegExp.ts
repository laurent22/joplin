// We move this regex outside KeymapService because it makes gettext parsing
// fail. In fact it doesn't fail at the regex itself but at the next backtick
// into the code. Probably their parser see a backtick in the regex and opens a
// JS template string, while it shouldn't.
// https://discourse.joplinapp.org/t/translations/12832?u=laurent

const keysRegExp = /^([0-9A-Z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]']|F1*[1-9]|F10|F2[0-4]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen|Numlock|Scrolllock|Capslock|num([0-9]|dec|add|sub|mult|div))$/;

export default keysRegExp;

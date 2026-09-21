import SwiftUI

// MARK: - Brand yellow palette
// Single source of truth for the approved yellow shades (same values in
// light and dark mode — see Android's ui/theme/Color.kt AppColors object and
// the --color-* custom properties in Mac/EditorBundle/build.mjs for the
// mirrored definitions used by the shared ProseMirror editor).
// vividYellow and darkYellow used to be two shades (#F9B524 / #DEAA33); both are
// now the single brand yellow #F9B524. The two names are kept because they mark
// different roles and may diverge again.
enum AppColors {
    /// Selected notebook row (sidebar) while the sidebar itself has keyboard focus;
    /// also new note/new notebook buttons.
    static let vividYellow = Color(red: 0xF9 / 255, green: 0xB5 / 255, blue: 0x24 / 255)          // #F9B524

    /// Main tint/accent color, text caret, modal text buttons, active text field;
    /// also the text color of a selected-but-unfocused sidebar row (see
    /// sidebarSelectedInactiveBackground below).
    static let darkYellow = Color(red: 0xF9 / 255, green: 0xB5 / 255, blue: 0x24 / 255)           // #F9B524

    /// Selected note row background whenever the sidebar does NOT have focus
    /// (i.e. focus is in the note list or the editor).
    static let dimmedYellow = Color(red: 0xFB / 255, green: 0xE6 / 255, blue: 0x99 / 255)         // #FBE699

    /// Text selection highlight inside the editor.
    static let textSelectYellow = Color(red: 0xFA / 255, green: 0xEB / 255, blue: 0xC3 / 255)     // #FAEBC3

    /// Dark-mode counterpart of dimmedYellow for the selected note row. The pale
    /// tint above only works under dark text; in dark mode the row's label is
    /// near-white, so the yellow is shaded down rather than tinted up (the brand
    /// yellow #F9B524 at 62% brightness, hue and saturation unchanged). Apple Notes
    /// solves it the same way: its selected note row is #FFE381 in light mode and
    /// #9E8223 in dark, keeping the label near-white in both.
    static let dimmedYellowDark = Color(red: 0x9E / 255, green: 0x74 / 255, blue: 0x17 / 255)     // #9E7417

    /// Selected note row background when the sidebar DOES have focus (the yellow one):
    /// the pale tint in light mode, the shaded gold in dark. See dimmedYellowDark.
    static func noteRowSelectedActiveBackground(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? dimmedYellowDark : dimmedYellow
    }

    /// Selected notebook row background when the sidebar does NOT have focus.
    static func sidebarSelectedInactiveBackground(_ scheme: ColorScheme) -> Color {
        scheme == .dark
            ? Color(red: 0x26 / 255, green: 0x29 / 255, blue: 0x29 / 255)   // #262929
            : Color(red: 0xEE / 255, green: 0xEE / 255, blue: 0xEE / 255)   // #EEEEEE
    }

    /// Selected note row background when the sidebar DOES have focus.
    static func noteRowSelectedInactiveBackground(_ scheme: ColorScheme) -> Color {
        scheme == .dark
            ? Color(red: 0x47 / 255, green: 0x45 / 255, blue: 0x46 / 255)   // #474546
            : Color(red: 0xDD / 255, green: 0xDC / 255, blue: 0xDC / 255)   // #DDDCDC
    }
}

// MARK: - Search highlighting

/// Search-result highlight background, adapted to the color scheme: the light tint in
/// light mode, and the strong/vivid yellow in dark mode (the light tint has too little
/// contrast against dark rows / light text). Matches the in-note find's current-match
/// color in dark mode.
extension AppColors {
    static func searchHighlight(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? vividYellow : textSelectYellow
    }
}

/// Returns [text] as an AttributedString with every case-insensitive occurrence of
/// [query] given the scheme-appropriate search highlight background (see
/// AppColors.searchHighlight) — used to highlight the matched text in note-list search
/// results (title and preview) on all Apple platforms. Built by concatenating
/// AttributedString pieces from ranges found on the original string, so there's no
/// fragile String/AttributedString index conversion. Returns the plain string when
/// [query] is empty.
func searchHighlighted(_ text: String, query: String, scheme: ColorScheme) -> AttributedString {
    let background = AppColors.searchHighlight(scheme)
    guard !query.isEmpty else { return AttributedString(text) }
    var result = AttributedString()
    var searchStart = text.startIndex
    while searchStart < text.endIndex,
          let match = text.range(of: query, options: .caseInsensitive, range: searchStart..<text.endIndex) {
        result += AttributedString(String(text[searchStart..<match.lowerBound]))
        var matched = AttributedString(String(text[match]))
        matched.backgroundColor = background
        result += matched
        searchStart = match.upperBound
    }
    if searchStart < text.endIndex {
        result += AttributedString(String(text[searchStart...]))
    }
    return result
}

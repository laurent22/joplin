import SwiftUI

// Settings > Tint. Values are the Figma "Notes TN" modes: Light/Dark for yellow,
// Purple Light/Purple Dark for purple. Colours not listed here are shared.
enum NotesTint: String, CaseIterable, Identifiable {
    case yellow, purple

    static let storageKey = "noteTint"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .yellow: return "Yellow"
        case .purple: return "Purple"
        }
    }

    // accent/fill
    var accent: Color {
        switch self {
        case .yellow: return dynamicColor(light: 0xF9B524, dark: 0xFFC837)
        case .purple: return dynamicColor(light: 0x783CE5, dark: 0x8350EA)
        }
    }

    // accent/text: the selected sidebar row's label while the sidebar isn't focused
    var accentText: Color {
        switch self {
        case .yellow: return dynamicColor(light: 0xF5B01F, dark: 0xFFCF3E)
        case .purple: return dynamicColor(light: 0x7033DE, dark: 0xAB87F2)
        }
    }

    // accent/text-inactive-window
    var accentTextInactive: Color {
        switch self {
        case .yellow: return dynamicColor(light: 0xF9E7C3, dark: 0x5C4F2C)
        case .purple: return dynamicColor(light: 0xD9C8F8, dark: 0x43306A)
        }
    }

    // selection/row-focused
    var rowSelectedFocused: Color {
        switch self {
        case .yellow: return dynamicColor(light: 0xFFE381, dark: 0x9E8422)
        case .purple: return dynamicColor(light: 0xDCCBFA, dark: 0x4B2F85)
        }
    }

    // text/link, also the colour of search matches in list rows
    var link: Color {
        switch self {
        case .yellow: return dynamicColor(light: 0xFCB827, dark: 0xFCB827)
        case .purple: return dynamicColor(light: 0x783CE5, dark: 0xA47DF1)
        }
    }
}

// Settings > Default text size: one stop per slider tick. The note body scales from
// the 13 pt default; the list, sidebar and menus keep their sizes.
enum NoteTextSize {
    static let storageKey = "noteTextSizeIndex"
    static let points: [CGFloat] = [11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28]
    static let defaultIndex = 2

    static func scale(forIndex index: Int) -> CGFloat {
        points[min(max(index, 0), points.count - 1)] / 13
    }
}

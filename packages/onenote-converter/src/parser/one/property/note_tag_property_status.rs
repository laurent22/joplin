use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;

/// The status of a note tag.
///
/// See [\[MS-ONE\] 2.3.87].
///
/// [\[MS-ONE\] 2.3.87]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/24274836-ec41-4fee-913f-225d65ac457c
#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub struct NoteTagPropertyStatus {
    has_label: bool,
    has_font_color: bool,
    has_highlight_color: bool,
    has_icon: bool,
    due_today: bool,
    due_tomorrow: bool,
    due_this_week: bool,
    due_next_week: bool,
    due_later: bool,
    due_custom: bool,
}

impl NoteTagPropertyStatus {
    /// Whether the note tag has a labe.
    pub fn has_label(&self) -> bool {
        self.has_label
    }

    /// Whether the note tag has a font color.
    pub fn has_font_color(&self) -> bool {
        self.has_font_color
    }

    /// Whether the note tag has a text highlight color.
    pub fn has_highlight_color(&self) -> bool {
        self.has_highlight_color
    }

    /// Whether the note tag has an icon.
    pub fn has_icon(&self) -> bool {
        self.has_icon
    }

    /// Whether the note tag has is due today.
    pub fn due_today(&self) -> bool {
        self.due_today
    }

    /// Whether the note tag has is due tomorrow.
    pub fn due_tomorrow(&self) -> bool {
        self.due_tomorrow
    }

    /// Whether the note tag has is due this week.
    pub fn due_this_week(&self) -> bool {
        self.due_this_week
    }

    /// Whether the note tag has is due next week.
    pub fn due_next_week(&self) -> bool {
        self.due_next_week
    }

    /// Whether the note tag has is due later.
    pub fn due_later(&self) -> bool {
        self.due_later
    }

    /// Whether the note tag has is due at a custom date.
    pub fn due_custom(&self) -> bool {
        self.due_custom
    }
}

impl NoteTagPropertyStatus {
    pub(crate) fn parse(object: &Object) -> Result<Option<NoteTagPropertyStatus>> {
        let value = match object.props().get(PropertyType::NoteTagPropertyStatus) {
            Some(value) => value.to_u32().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData("note tag property status is not a u32".into())
            })?,
            None => return Ok(None),
        };

        let status = NoteTagPropertyStatus {
            has_label: value & 0x1 != 0,
            has_font_color: (value >> 1) & 0x1 != 0,
            has_highlight_color: (value >> 2) & 0x1 != 0,
            has_icon: (value >> 3) & 0x1 != 0,
            due_today: (value >> 6) & 0x1 != 0,
            due_tomorrow: (value >> 7) & 0x1 != 0,
            due_this_week: (value >> 8) & 0x1 != 0,
            due_next_week: (value >> 9) & 0x1 != 0,
            due_later: (value >> 10) & 0x1 != 0,
            due_custom: (value >> 11) & 0x1 != 0,
        };

        Ok(Some(status))
    }
}

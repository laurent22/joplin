use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;

/// A layout alignment specification.
///
/// See [\[MS-ONE\] 2.3.2]
///
/// [\[MS-ONE\] 2.3.2]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/bd99face-5839-4276-863d-a4f2cbb81246
#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub struct LayoutAlignment {
    alignment_horizontal: HorizontalAlignment,
    alignment_margin_horizontal: HorizontalAlignmentMargin,
    alignment_vertical: VerticalAlignment,
    alignment_margin_vertical: VerticalAlignmentMargin,
}

impl LayoutAlignment {
    pub fn alignment_horizontal(&self) -> HorizontalAlignment {
        self.alignment_horizontal
    }

    pub fn alignment_margin_horizontal(&self) -> HorizontalAlignmentMargin {
        self.alignment_margin_horizontal
    }

    pub fn alignment_vertical(&self) -> VerticalAlignment {
        self.alignment_vertical
    }

    pub fn alignment_margin_vertical(&self) -> VerticalAlignmentMargin {
        self.alignment_margin_vertical
    }
}

impl LayoutAlignment {
    pub(crate) fn parse(
        prop_type: PropertyType,
        object: &Object,
    ) -> Result<Option<LayoutAlignment>> {
        let value = match object.props().get(prop_type) {
            Some(value) => value.to_u32().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData("layout alignment is not a u32".into())
            })?,
            None => return Ok(None),
        };

        if (value >> 31) & 0x1 != 0 {
            return Ok(None);
        }

        let alignment_horizontal = HorizontalAlignment::parse(value & 0x7)?;
        let alignment_margin_horizontal = HorizontalAlignmentMargin::parse((value >> 3) & 0x1)?;
        let alignment_vertical = VerticalAlignment::parse((value >> 16) & 0x1)?;
        let alignment_margin_vertical = VerticalAlignmentMargin::parse((value >> 19) & 0x1)?;

        Ok(Some(LayoutAlignment {
            alignment_horizontal,
            alignment_margin_horizontal,
            alignment_vertical,
            alignment_margin_vertical,
        }))
    }
}

#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub enum HorizontalAlignment {
    Unknown,
    Left,
    Center,
    Right,
    BiDiNormal,
    BiDiReverse,
}

impl HorizontalAlignment {
    pub(crate) fn parse(value: u32) -> Result<HorizontalAlignment> {
        match value {
            0 => Ok(HorizontalAlignment::Unknown),
            1 => Ok(HorizontalAlignment::Left),
            2 => Ok(HorizontalAlignment::Center),
            3 => Ok(HorizontalAlignment::Right),
            4 => Ok(HorizontalAlignment::BiDiNormal),
            5 => Ok(HorizontalAlignment::BiDiReverse),
            _ => Err(ErrorKind::MalformedOneNoteFileData(
                format!("invalid horizontal alignment: {}", value).into(),
            )
            .into()),
        }
    }
}

#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub enum HorizontalAlignmentMargin {
    Right,
    Left,
}

impl HorizontalAlignmentMargin {
    pub(crate) fn parse(value: u32) -> Result<HorizontalAlignmentMargin> {
        match value {
            0 => Ok(HorizontalAlignmentMargin::Right),
            1 => Ok(HorizontalAlignmentMargin::Left),
            _ => Err(ErrorKind::MalformedOneNoteFileData(
                format!("invalid horizontal alignment margin: {}", value).into(),
            )
            .into()),
        }
    }
}

#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub enum VerticalAlignment {
    Bottom,
    Top,
}

impl VerticalAlignment {
    pub(crate) fn parse(value: u32) -> Result<VerticalAlignment> {
        match value {
            0 => Ok(VerticalAlignment::Bottom),
            1 => Ok(VerticalAlignment::Top),
            _ => Err(ErrorKind::MalformedOneNoteFileData(
                format!("invalid vertical alignment: {}", value).into(),
            )
            .into()),
        }
    }
}

#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub enum VerticalAlignmentMargin {
    Bottom,
    Top,
}

impl VerticalAlignmentMargin {
    pub(crate) fn parse(value: u32) -> Result<VerticalAlignmentMargin> {
        match value {
            0 => Ok(VerticalAlignmentMargin::Bottom),
            1 => Ok(VerticalAlignmentMargin::Top),
            _ => Err(ErrorKind::MalformedOneNoteFileData(
                format!("invalid vertical alignment margin: {}", value).into(),
            )
            .into()),
        }
    }
}

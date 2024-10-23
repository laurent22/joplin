use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;

/// A page size declaration.
///
/// See [\[MS-ONE\] 2.3.36].
///
/// [\[MS-ONE\] 2.3.36]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/8866c05a-602d-4868-95de-2d8b1a0b9d2e
#[derive(Debug)]
pub(crate) enum PageSize {
    Auto,
    Us,
    AnsiLetter,
    AnsiTabloid,
    UsLegal,
    IsoA3,
    IsoA4,
    IsoA5,
    IsoA6,
    JisB4,
    JisB5,
    JisB6,
    JapanesePostcard,
    IndexCard,
    Billfold,
    Custom,
}

impl PageSize {
    pub(crate) fn parse(prop_type: PropertyType, object: &Object) -> Result<Option<PageSize>> {
        let value = match object.props().get(prop_type) {
            Some(value) => value.try_to_u8().ok_or_else(|| {
                ErrorKind::MalformedOneNoteIncorrectType(format!(
                    "page size is not a u8 but {:?}",
                    value
                ))
            })?,
            None => return Ok(None),
        };

        let page_size = match value {
            0 => PageSize::Auto,
            1 => PageSize::Us,
            2 => PageSize::AnsiLetter,
            3 => PageSize::AnsiTabloid,
            4 => PageSize::UsLegal,
            5 => PageSize::IsoA3,
            6 => PageSize::IsoA4,
            7 => PageSize::IsoA5,
            8 => PageSize::IsoA6,
            9 => PageSize::JisB4,
            10 => PageSize::JisB5,
            11 => PageSize::JisB6,
            12 => PageSize::JapanesePostcard,
            13 => PageSize::IndexCard,
            14 => PageSize::Billfold,
            15 => PageSize::Custom,
            _ => {
                return Err(ErrorKind::MalformedOneNoteFileData(
                    format!("invalid page size: {}", value).into(),
                )
                .into())
            }
        };

        Ok(Some(page_size))
    }
}

impl Default for PageSize {
    fn default() -> Self {
        PageSize::Auto
    }
}

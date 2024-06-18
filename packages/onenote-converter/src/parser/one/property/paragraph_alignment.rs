use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;

/// A paragraph's alignment.
///
/// See [\[MS-ONE\] 2.3.94].
///
/// [\[MS-ONE\] 2.3.94]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/36edb135-5e8e-400f-9394-82853d662d90
#[allow(missing_docs)]
#[derive(Debug, Copy, Clone, PartialEq)]
pub enum ParagraphAlignment {
    Unknown,
    Left,
    Center,
    Right,
}

impl ParagraphAlignment {
    pub(crate) fn parse(object: &Object) -> Result<Option<ParagraphAlignment>> {
        let value = match object.props().get(PropertyType::ParagraphAlignment) {
            Some(value) => value.try_to_u8().ok_or_else(|| {
                ErrorKind::MalformedOneNoteIncorrectType(format!(
                    "page size is not a u8 but {:?}",
                    value
                ))
            })?,
            None => return Ok(None),
        };

        Ok(Some(match value {
            0 => ParagraphAlignment::Left,
            1 => ParagraphAlignment::Center,
            2 => ParagraphAlignment::Right,
            _ => ParagraphAlignment::Unknown,
        }))
    }
}

impl Default for ParagraphAlignment {
    fn default() -> Self {
        ParagraphAlignment::Left
    }
}

use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;

/// A RGBA color value.
///
/// See [\[MS-ONE\] 2.2.7]
///
/// [\[MS-ONE\] 2.2.7]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/6e4a87f9-18f0-4ad6-bc7d-0f326d61e136
#[derive(Debug, Copy, Clone, PartialEq)]
pub struct Color {
    alpha: u8,
    r: u8,
    g: u8,
    b: u8,
}

impl Color {
    /// The color's transparency value.
    pub fn alpha(&self) -> u8 {
        self.alpha
    }

    /// The color's red value.
    pub fn r(&self) -> u8 {
        self.r
    }

    /// The color's green value.
    pub fn g(&self) -> u8 {
        self.g
    }

    /// The color's blue value.
    pub fn b(&self) -> u8 {
        self.b
    }
}

impl Color {
    pub(crate) fn parse(prop_type: PropertyType, object: &Object) -> Result<Option<Color>> {
        let value = match object.props().get(prop_type) {
            Some(value) => value
                .to_u32()
                .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("color is not a u32".into()))?,
            None => return Ok(None),
        };

        let bytes = value.to_le_bytes();

        Ok(Some(Color {
            alpha: 255 - bytes[3],
            r: bytes[0],
            g: bytes[1],
            b: bytes[2],
        }))
    }
}

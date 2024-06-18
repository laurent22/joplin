use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;

/// An RGB color value.
///
/// See [\[MS-ONE\] 2.2.8]
///
/// [\[MS-ONE\] 2.2.8]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/3796cb27-7ec3-4dc9-b43e-7c31cc5b765d
#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub enum ColorRef {
    /// Determined by the application.
    Auto,

    /// A manually specified color
    Manual {
        /// The color's red value.
        r: u8,
        /// The color's green value.
        g: u8,
        /// The color's blue value
        b: u8,
    },
}

impl ColorRef {
    pub(crate) fn parse(prop_type: PropertyType, object: &Object) -> Result<Option<ColorRef>> {
        let value = match object.props().get(prop_type) {
            Some(value) => value.to_u32().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData("color ref is not a u32".into())
            })?,
            None => return Ok(None),
        };

        let bytes = value.to_le_bytes();

        let color = match bytes[3] {
            0xFF => ColorRef::Auto,
            0x00 => ColorRef::Manual {
                r: bytes[0],
                g: bytes[1],
                b: bytes[2],
            },
            _ => {
                return Err(ErrorKind::MalformedOneNoteFileData(
                    format!("invalid color ref: 0x{:08X}", value).into(),
                )
                .into())
            }
        };

        Ok(Some(color))
    }
}

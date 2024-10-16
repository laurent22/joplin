use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;

/// A charset representation.
///
/// See [\[MS-ONE\] 2.3.55].
///
/// [\[MS-ONE\] 2.3.55]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/64e2db6e-6eeb-443c-9ccf-0f72b37ba411
#[allow(missing_docs)]
#[derive(Debug, Copy, Clone)]
pub enum Charset {
    Ansi,
    Default,
    Symbol,
    Mac,
    ShiftJis,
    Hangul,
    Johab,
    Gb2312,
    ChineseBig5,
    Greek,
    Turkish,
    Vietnamese,
    Hebrew,
    Arabic,
    Baltic,
    Russian,
    Thai,
    EastEurope,
    Oem,
}

impl Charset {
    pub(crate) fn parse(prop_type: PropertyType, object: &Object) -> Result<Option<Charset>> {
        let value = match object.props().get(prop_type) {
            Some(value) => value
                .to_u8()
                .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("charset is not a u8".into()))?,
            None => return Ok(None),
        };

        let charset = match value {
            0 => Charset::Ansi,
            1 => Charset::Default,
            2 => Charset::Symbol,
            77 => Charset::Mac,
            128 => Charset::ShiftJis,
            129 => Charset::Hangul,
            130 => Charset::Johab,
            134 => Charset::Gb2312,
            136 => Charset::ChineseBig5,
            161 => Charset::Greek,
            162 => Charset::Turkish,
            163 => Charset::Vietnamese,
            177 => Charset::Hebrew,
            178 => Charset::Arabic,
            186 => Charset::Baltic,
            204 => Charset::Russian,
            222 => Charset::Thai,
            238 => Charset::EastEurope,
            255 => Charset::Oem,
            _ => {
                return Err(ErrorKind::MalformedOneNoteFileData(
                    format!("invalid charset: {}", value).into(),
                )
                .into())
            }
        };

        Ok(Some(charset))
    }
}

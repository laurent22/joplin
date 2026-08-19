use crate::one::property::color_ref::ColorRef;
use crate::one::property::time::Time;
use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use parser_utils::errors::{ErrorKind, Result};
use std::char::{REPLACEMENT_CHARACTER, decode_utf16};

/// A number list definition.
///
/// See [\[MS-ONE\] 2.2.25].
///
/// [\[MS-ONE\] 2.2.25]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/1a141e7a-4455-4971-bf0b-1621e221984e
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) last_modified: Time,
    pub(crate) list_font: Option<String>,
    pub(crate) list_restart: Option<i32>,
    pub(crate) list_format: Vec<char>,
    pub(crate) bold: bool,
    pub(crate) italic: bool,
    pub(crate) language_code: Option<u32>,
    pub(crate) font: Option<String>,
    pub(crate) font_size: Option<u16>,
    pub(crate) font_color: Option<ColorRef>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::NumberListNode.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let last_modified = Time::parse(PropertyType::LastModifiedTime, object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("number list has no last modified time".into())
    })?;
    let list_font = simple::parse_string(PropertyType::ListFont, object)?;
    let list_restart =
        simple::parse_u32(PropertyType::ListRestart, object)?.map(|value| value as i32);
    let list_format = simple::parse_vec_u16(PropertyType::NumberListFormat, object)?
        .map(parse_list_format)
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("number list has no list format".into())
        })?;
    let bold = simple::parse_bool(PropertyType::Bold, object)?.unwrap_or_default();
    let italic = simple::parse_bool(PropertyType::Italic, object)?.unwrap_or_default();
    let language_code = simple::parse_u32(PropertyType::LanguageId, object)?;
    let font = simple::parse_string(PropertyType::Font, object)?;
    let font_size = simple::parse_u16(PropertyType::FontSize, object)?;
    let font_color = ColorRef::parse(PropertyType::FontColor, object)?;

    let data = Data {
        last_modified,
        list_font,
        list_restart,
        list_format,
        bold,
        italic,
        language_code,
        font,
        font_size,
        font_color,
    };

    Ok(data)
}

fn parse_list_format(data: Vec<u16>) -> Vec<char> {
    decode_utf16(data[1..].iter().copied())
        .map(|r| r.unwrap_or(REPLACEMENT_CHARACTER))
        .collect()
}

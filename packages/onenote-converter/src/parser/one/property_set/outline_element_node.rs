use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::time::Time;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// An outline element.
///
/// See [\[MS-ONE\] 2.2.21].
///
/// [\[MS-ONE\] 2.2.21]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/d47760a6-6f1f-4fd5-b2ad-a51fe5a72c21
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) created_at: Time,
    pub(crate) last_modified: Time,
    pub(crate) children: Vec<ExGuid>,
    pub(crate) child_level: u8,
    pub(crate) contents: Vec<ExGuid>,
    pub(crate) list_contents: Vec<ExGuid>,
    pub(crate) list_spacing: Option<f32>,
    pub(crate) author_original: ExGuid,
    pub(crate) author_most_recent: ExGuid,
    pub(crate) rtl: bool,
    pub(crate) is_deletable: bool,
    pub(crate) is_selectable: bool,
    pub(crate) is_title_text: bool,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::OutlineElementNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let created_at = Time::parse(PropertyType::CreationTimeStamp, object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("outline element has no creation timestamp".into())
    })?;
    let last_modified = Time::parse(PropertyType::LastModifiedTime, object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("outline element has no last modified time".into())
    })?;
    let children =
        ObjectReference::parse_vec(PropertyType::ElementChildNodes, object)?.unwrap_or_default();
    let child_level = simple::parse_u8(PropertyType::OutlineElementChildLevel, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("outline has no child element level".into())
        })?;
    let contents =
        ObjectReference::parse_vec(PropertyType::ContentChildNodes, object)?.unwrap_or_default();
    let list_contents =
        ObjectReference::parse_vec(PropertyType::ListNodes, object)?.unwrap_or_default();
    let list_spacing = simple::parse_f32(PropertyType::ListSpacingMu, object)?;
    let author_original = ObjectReference::parse(PropertyType::AuthorOriginal, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("outline element has no original author".into())
        })?;
    let author_most_recent = ObjectReference::parse(PropertyType::AuthorMostRecent, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("outline element has no most recent author".into())
        })?;
    let rtl = simple::parse_bool(PropertyType::OutlineElementRtl, object)?.unwrap_or_default();
    let is_deletable = simple::parse_bool(PropertyType::Deletable, object)?.unwrap_or_default();
    let is_selectable = simple::parse_bool(PropertyType::CannotBeSelected, object)?
        .map(|value| !value)
        .unwrap_or_default();
    let is_title_text = simple::parse_bool(PropertyType::IsTitleText, object)?.unwrap_or_default();

    let data = Data {
        created_at,
        last_modified,
        children,
        child_level,
        contents,
        list_contents,
        list_spacing,
        author_original,
        author_most_recent,
        rtl,
        is_deletable,
        is_selectable,
        is_title_text,
    };

    Ok(data)
}

use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::file_type::FileType;
use crate::parser::one::property::layout_alignment::LayoutAlignment;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::time::Time;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::note_tag_container::Data as NoteTagData;
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;
use crate::utils::utils::log_warn;

/// An embedded file.
///
/// See [\[MS-ONE\] 2.2.32].
///
/// [\[MS-ONE\] 2.2.32]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/a665b5ad-ff40-4c0c-9e42-4b707254dc3f
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) last_modified: Time,
    pub(crate) picture_container: Option<ExGuid>,
    pub(crate) layout_max_width: Option<f32>,
    pub(crate) layout_max_height: Option<f32>,
    pub(crate) is_layout_size_set_by_user: bool,
    pub(crate) text: Option<String>,
    pub(crate) text_language_code: Option<u32>,
    pub(crate) layout_alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) layout_alignment_self: Option<LayoutAlignment>,
    pub(crate) embedded_file_container: ExGuid,
    pub(crate) embedded_file_name: String,
    pub(crate) source_path: Option<String>,
    pub(crate) file_type: FileType,
    pub(crate) picture_width: Option<f32>,
    pub(crate) picture_height: Option<f32>,
    pub(crate) note_tags: Vec<NoteTagData>,
    pub(crate) offset_from_parent_horiz: Option<f32>,
    pub(crate) offset_from_parent_vert: Option<f32>,
    pub(crate) recording_duration: Option<u32>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::EmbeddedFileNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let last_modified = Time::parse(PropertyType::LastModifiedTime, object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("embedded file has no last modified time".into())
    })?;
    let picture_container = ObjectReference::parse(PropertyType::PictureContainer, object)?;
    let layout_max_width = simple::parse_f32(PropertyType::LayoutMaxWidth, object)?;
    let layout_max_height = simple::parse_f32(PropertyType::LayoutMaxHeight, object)?;
    let is_layout_size_set_by_user =
        simple::parse_bool(PropertyType::IsLayoutSizeSetByUser, object)?.unwrap_or_default();
    let text = simple::parse_string(PropertyType::RichEditTextUnicode, object)?;
    let text_language_code =
        simple::parse_u16(PropertyType::RichEditTextLangId, object)?.map(|value| value as u32);
    let layout_alignment_in_parent =
        LayoutAlignment::parse(PropertyType::LayoutAlignmentInParent, object)?;
    let layout_alignment_self = LayoutAlignment::parse(PropertyType::LayoutAlignmentSelf, object)?;
    let embedded_file_container =
        ObjectReference::parse(PropertyType::EmbeddedFileContainer, object)?.ok_or_else(|| {
            log_warn!("embeded file has no file container");
            ErrorKind::MalformedOneNoteFileData("embedded file has no file container".into())
        })?;

    let embedded_file_name = simple::parse_string(PropertyType::EmbeddedFileName, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("embedded file has no file name".into())
        })?;
    let source_path = simple::parse_string(PropertyType::SourceFilepath, object)?;
    let file_type = FileType::parse(object)?;
    let picture_width = simple::parse_f32(PropertyType::PictureWidth, object)?;
    let picture_height = simple::parse_f32(PropertyType::PictureHeight, object)?;
    let offset_from_parent_horiz = simple::parse_f32(PropertyType::OffsetFromParentHoriz, object)?;
    let offset_from_parent_vert = simple::parse_f32(PropertyType::OffsetFromParentVert, object)?;
    // let recording_duration = simple::parse_u32(PropertyType::Duration) // FIXME: Record duration property id not known

    let note_tags = NoteTagData::parse(object)?.unwrap_or_default();

    let data = Data {
        last_modified,
        picture_container,
        layout_max_width,
        layout_max_height,
        is_layout_size_set_by_user,
        text,
        text_language_code,
        layout_alignment_in_parent,
        layout_alignment_self,
        embedded_file_container,
        embedded_file_name,
        source_path,
        file_type,
        picture_width,
        picture_height,
        note_tags,
        offset_from_parent_horiz,
        offset_from_parent_vert,
        recording_duration: None, // FIXME: Parse this
    };

    Ok(data)
}

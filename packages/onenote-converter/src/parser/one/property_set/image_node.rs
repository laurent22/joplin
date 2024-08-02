use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::layout_alignment::LayoutAlignment;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::note_tag_container::Data as NoteTagData;
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// An embedded image.
///
/// See [\[MS-ONE\] 2.2.24].
///
/// [\[MS-ONE\] 2.2.24]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/b7bb4d1a-2a57-4819-9eb4-5a2ce8cf210f
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    // pub(crate) last_modified: Time,
    pub(crate) picture_container: Option<ExGuid>,
    pub(crate) layout_max_width: Option<f32>,
    pub(crate) layout_max_height: Option<f32>,
    pub(crate) is_layout_size_set_by_user: bool,
    pub(crate) language_code: Option<u32>,
    pub(crate) alt_text: Option<String>,
    pub(crate) layout_alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) layout_alignment_self: Option<LayoutAlignment>,
    pub(crate) image_filename: Option<String>,
    pub(crate) displayed_page_number: Option<u32>,
    pub(crate) text: Option<String>,
    pub(crate) text_language_code: Option<u32>,
    pub(crate) picture_width: Option<f32>,
    pub(crate) picture_height: Option<f32>,
    pub(crate) hyperlink_url: Option<String>,
    pub(crate) note_tags: Vec<NoteTagData>,
    pub(crate) offset_from_parent_horiz: Option<f32>,
    pub(crate) offset_from_parent_vert: Option<f32>,
    pub(crate) is_background: bool,
    pub(crate) iframe: Vec<ExGuid>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::ImageNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    // TODO: add support for last_modified
    // let last_modified = Time::parse(PropertyType::LastModifiedTime, object)?.ok_or_else(|| now )?;
    // let last_modified = match Time::parse(PropertyType::LastModifiedTime, object) {
    //     Ok(time) => Ok(time.unwrap()),
    //     Ok(None) => Ok(now),
    //     Err(time_err) => Ok(now),
    // }?;
    let picture_container = ObjectReference::parse(PropertyType::PictureContainer, object)?;
    let layout_max_width = simple::parse_f32(PropertyType::LayoutMaxWidth, object)?;
    let layout_max_height = simple::parse_f32(PropertyType::LayoutMaxHeight, object)?;
    let is_layout_size_set_by_user =
        simple::parse_bool(PropertyType::IsLayoutSizeSetByUser, object)?.unwrap_or_default();
    let language_code = simple::parse_u32(PropertyType::LanguageId, object)?;
    let alt_text = simple::parse_string(PropertyType::ImageAltText, object)?;
    let layout_alignment_in_parent =
        LayoutAlignment::parse(PropertyType::LayoutAlignmentInParent, object)?;
    let layout_alignment_self = LayoutAlignment::parse(PropertyType::LayoutAlignmentSelf, object)?;
    let image_filename = simple::parse_string(PropertyType::ImageFilename, object)?;
    let displayed_page_number = simple::parse_u32(PropertyType::DisplayedPageNumber, object)?;
    let text = simple::parse_string(PropertyType::RichEditTextUnicode, object)?;
    let text_language_code =
        simple::parse_u16(PropertyType::RichEditTextLangId, object)?.map(|value| value as u32);
    let picture_width = simple::parse_f32(PropertyType::PictureWidth, object)?;
    let picture_height = simple::parse_f32(PropertyType::PictureHeight, object)?;
    let hyperlink_url = simple::parse_string(PropertyType::WzHyperlinkUrl, object)?;
    let offset_from_parent_horiz = simple::parse_f32(PropertyType::OffsetFromParentHoriz, object)?;
    let offset_from_parent_vert = simple::parse_f32(PropertyType::OffsetFromParentVert, object)?;
    let is_background = simple::parse_bool(PropertyType::IsBackground, object)?.unwrap_or_default();

    let note_tags = NoteTagData::parse(object)?.unwrap_or_default();

    let iframe =
        ObjectReference::parse_vec(PropertyType::ContentChildNodes, object)?.unwrap_or_default();

    let data = Data {
        // last_modified,
        picture_container,
        layout_max_width,
        layout_max_height,
        is_layout_size_set_by_user,
        language_code,
        alt_text,
        layout_alignment_in_parent,
        layout_alignment_self,
        image_filename,
        displayed_page_number,
        text,
        text_language_code,
        picture_width,
        picture_height,
        hyperlink_url,
        note_tags,
        offset_from_parent_horiz,
        offset_from_parent_vert,
        is_background,
        iframe,
    };

    Ok(data)
}

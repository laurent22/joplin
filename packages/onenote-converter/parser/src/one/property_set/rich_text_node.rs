use crate::one::property::layout_alignment::LayoutAlignment;
use crate::one::property::object_reference::ObjectReference;
use crate::one::property::paragraph_alignment::ParagraphAlignment;
use crate::one::property::time::Time;
use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::one::property_set::note_tag_container::Data as NoteTagData;
use crate::onestore::object::Object;
use crate::shared::exguid::ExGuid;
use crate::shared::prop_set::PropertySet;
use parser_utils::errors::{ErrorKind, Result};
use parser_utils::{Utf16ToString, log_warn};

/// A rich text paragraph.
///
/// See [\[MS-ONE\] 2.2.23].
///
/// [\[MS-ONE\] 2.2.23]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/980fae36-b5dd-4581-bf1e-5ab54177153d
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) last_modified_time: Time,
    pub(crate) tight_layout: bool,
    pub(crate) text_run_formatting: Vec<ExGuid>,
    pub(crate) text_run_indices: Vec<u32>,
    pub(crate) text_run_data_object: Vec<ExGuid>,
    pub(crate) text_run_data_values: Vec<PropertySet>,
    pub(crate) paragraph_style: ExGuid,
    pub(crate) paragraph_space_before: f32,
    pub(crate) paragraph_space_after: f32,
    pub(crate) paragraph_line_spacing_exact: Option<f32>,
    pub(crate) paragraph_alignment: ParagraphAlignment,
    pub(crate) is_title_time: bool,
    pub(crate) is_boiler_text: bool,
    pub(crate) is_title_date: bool,
    pub(crate) is_title_text: bool,
    pub(crate) layout_alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) layout_alignment_self: Option<LayoutAlignment>,
    pub(crate) language_code: Option<u32>,
    pub(crate) rtl: bool,
    pub(crate) note_tags: Vec<NoteTagData>,
    pub(crate) text: Option<String>,
    pub(crate) text_utf_16: Option<Vec<u8>>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::RichTextNode.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let last_modified_time =
        Time::parse(PropertyType::LastModifiedTime, object)?.ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("rich text node has no last_modified time".into())
        })?;
    let tight_layout =
        simple::parse_bool(PropertyType::LayoutTightLayout, object)?.unwrap_or_default();
    let text_run_formatting =
        ObjectReference::parse_vec(PropertyType::TextRunFormatting, object)?.unwrap_or_default();
    let text_run_indices =
        simple::parse_vec_u32(PropertyType::TextRunIndex, object)?.unwrap_or_default();
    let text_run_data_object =
        ObjectReference::parse_vec(PropertyType::TextRunDataObject, object)?.unwrap_or_default();
    let text_run_data_array =
        simple::parse_property_values(PropertyType::TextRunData, object)?.unwrap_or(&[]);

    let paragraph_style_result = ObjectReference::parse(PropertyType::ParagraphStyle, object);
    let paragraph_style = match paragraph_style_result {
        Ok(Some(style)) => style,
        Ok(None) => {
            log_warn!("rich text has no paragraph style");
            ExGuid::fallback()
        }
        Err(e) => {
            log_warn!("error parsing paragraph style: {:?}", e);
            ExGuid::fallback()
        }
    };
    let paragraph_space_before =
        simple::parse_f32(PropertyType::ParagraphSpaceBefore, object)?.unwrap_or_default();
    let paragraph_space_after =
        simple::parse_f32(PropertyType::ParagraphSpaceAfter, object)?.unwrap_or_default();
    let paragraph_line_spacing_exact =
        simple::parse_f32(PropertyType::ParagraphLineSpacingExact, object)?;
    let paragraph_alignment = ParagraphAlignment::parse(object)?.unwrap_or_default();

    // Keep the text in its original UTF-16 byte array, if possible. This is needed later on for
    // indexing.
    let text_utf_16_bytes = simple::parse_vec(PropertyType::RichEditTextUnicode, object)?;
    let text_ascii = simple::parse_ascii(PropertyType::TextExtendedAscii, object)?;
    let text_string = text_utf_16_bytes
        .as_ref()
        .map(|data| data.as_slice().utf16_to_string())
        .transpose()?
        .or(text_ascii);
    let text_utf_16_bytes = text_utf_16_bytes.or_else(|| {
        // Fall back to re-encoding the ASCII representation as UTF-16, if it exists.
        text_string.as_ref().map(|text| {
            text.encode_utf16()
                .flat_map(|two_bytes| two_bytes.to_le_bytes())
                .collect()
        })
    });

    let layout_alignment_in_parent =
        LayoutAlignment::parse(PropertyType::LayoutAlignmentInParent, object)?;
    let layout_alignment_self = LayoutAlignment::parse(PropertyType::LayoutAlignmentSelf, object)?;

    let is_title_time = simple::parse_bool(PropertyType::IsTitleTime, object)?.unwrap_or_default();
    let is_boiler_text =
        simple::parse_bool(PropertyType::IsBoilerText, object)?.unwrap_or_default();
    let is_title_date = simple::parse_bool(PropertyType::IsTitleDate, object)?.unwrap_or_default();
    let is_title_text = simple::parse_bool(PropertyType::IsTitleText, object)?.unwrap_or_default();
    let language_code =
        simple::parse_u16(PropertyType::RichEditTextLangId, object)?.map(|value| value as u32);
    let rtl = simple::parse_bool(PropertyType::ReadingOrderRtl, object)?.unwrap_or_default();

    let note_tags = NoteTagData::parse(object)?.unwrap_or_default();

    let data = Data {
        last_modified_time,
        tight_layout,
        text_run_formatting,
        text_run_indices,
        text_run_data_values: text_run_data_array.into(),
        text_run_data_object,
        paragraph_style,
        paragraph_space_before,
        paragraph_space_after,
        paragraph_line_spacing_exact,
        paragraph_alignment,
        text_utf_16: text_utf_16_bytes,
        text: text_string,
        is_title_time,
        is_boiler_text,
        is_title_date,
        is_title_text,
        layout_alignment_in_parent,
        layout_alignment_self,
        language_code,
        rtl,
        note_tags,
    };

    Ok(data)
}

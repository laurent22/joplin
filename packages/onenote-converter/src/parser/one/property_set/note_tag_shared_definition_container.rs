use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::color_ref::ColorRef;
use crate::parser::one::property::note_tag::ActionItemType;
use crate::parser::one::property::note_tag_property_status::NoteTagPropertyStatus;
use crate::parser::one::property::note_tag_shape::NoteTagShape;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// An note tag shared definition container.
///
/// See [\[MS-ONE\] 2.2.41].
///
/// [\[MS-ONE\] 2.2.41]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/eb5f52d2-c507-45c8-9bda-f8c74d34533a
#[derive(Debug)]
pub(crate) struct Data {
    pub(crate) label: String,
    pub(crate) status: NoteTagPropertyStatus,
    pub(crate) shape: NoteTagShape,
    pub(crate) highlight_color: Option<ColorRef>,
    pub(crate) text_color: Option<ColorRef>,
    pub(crate) action_item_type: ActionItemType,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::NoteTagSharedDefinitionContainer.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let label = simple::parse_string(PropertyType::NoteTagLabel, object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("note tag container has no label".into())
    })?;
    let status = NoteTagPropertyStatus::parse(object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("note tag container has no status".into())
    })?;
    let shape = simple::parse_u16(PropertyType::NoteTagShape, object)?
        .map(NoteTagShape::parse)
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("note tag container has no shape".into())
        })?;
    let highlight_color = ColorRef::parse(PropertyType::NoteTagHighlightColor, object)?;
    let text_color = ColorRef::parse(PropertyType::NoteTagTextColor, object)?;
    let action_item_type = ActionItemType::parse(object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("note tag container has no action item type".into())
    })?;

    let data = Data {
        label,
        status,
        shape,
        highlight_color,
        text_color,
        action_item_type,
    };

    Ok(data)
}

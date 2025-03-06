use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::layout_alignment::LayoutAlignment;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::time::Time;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// A page title.
///
/// See [\[MS-ONE\] 2.2.29].
///
/// [\[MS-ONE\] 2.2.29]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/08bd4fd5-59fb-4568-9c82-d2d5280eced8
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) last_modified_time: Time,
    pub(crate) children: Vec<ExGuid>,
    pub(crate) offset_horizontal: f32,
    pub(crate) offset_vertical: f32,
    pub(crate) layout_alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) layout_alignment_self: Option<LayoutAlignment>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::TitleNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let last_modified_time =
        Time::parse(PropertyType::LastModifiedTime, object)?.ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("title node has no last_modified time".into())
        })?;

    let children = ObjectReference::parse_vec(PropertyType::ElementChildNodes, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("title node has no child nodes".into())
        })?;
    let offset_horizontal = simple::parse_f32(PropertyType::OffsetFromParentHoriz, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("title has no horizontal offset".into())
        })?;
    let offset_vertical = simple::parse_f32(PropertyType::OffsetFromParentVert, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("title has no vertical offset".into())
        })?;

    let layout_alignment_in_parent =
        LayoutAlignment::parse(PropertyType::LayoutAlignmentInParent, object)?;
    let layout_alignment_self = LayoutAlignment::parse(PropertyType::LayoutAlignmentSelf, object)?;

    let data = Data {
        last_modified_time,
        children,
        offset_horizontal,
        offset_vertical,
        layout_alignment_in_parent,
        layout_alignment_self,
    };

    Ok(data)
}

use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::color::Color;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::outline_indent_distance::OutlineIndentDistance;
use crate::parser::one::property::time::Time;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// A table cell.
///
/// See [\[MS-ONE\] 2.2.28].
///
/// [\[MS-ONE\] 2.2.28]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/e5660d6b-72c3-4d9f-bad0-435c00f42183
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) last_modified: Option<Time>,
    pub(crate) contents: Vec<ExGuid>,
    pub(crate) layout_max_width: Option<f32>,
    pub(crate) outline_indent_distance: OutlineIndentDistance,
    pub(crate) background_color: Option<Color>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::TableCellNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let last_modified = Time::parse(PropertyType::LastModifiedTime, object)?;
    let contents = ObjectReference::parse_vec(PropertyType::ElementChildNodes, object)?
        .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("table cell has no contents".into()))?;
    let layout_max_width = simple::parse_f32(PropertyType::LayoutMaxWidth, object)?;
    let outline_indent_distance = OutlineIndentDistance::parse(object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("table cell has no outline indent distance".into())
    })?;
    let background_color = Color::parse(PropertyType::CellBackgroundColor, object)?;

    let data = Data {
        last_modified,
        contents,
        layout_max_width,
        outline_indent_distance,
        background_color,
    };

    Ok(data)
}

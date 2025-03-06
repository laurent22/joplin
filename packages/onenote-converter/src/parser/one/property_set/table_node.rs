use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::layout_alignment::LayoutAlignment;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::time::Time;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::note_tag_container::Data as NoteTagData;
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// A table.
///
/// See [\[MS-ONE\] 2.2.26].
///
/// [\[MS-ONE\] 2.2.26]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/9046980a-2410-4b2d-8a35-ec06e55648e0
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) last_modified: Time,
    pub(crate) rows: Vec<ExGuid>,
    pub(crate) row_count: u32,
    pub(crate) col_count: u32,
    pub(crate) cols_locked: Vec<u8>,
    pub(crate) col_widths: Vec<f32>,
    pub(crate) borders_visible: bool,
    pub(crate) layout_alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) layout_alignment_self: Option<LayoutAlignment>,
    pub(crate) note_tags: Vec<NoteTagData>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::TableNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let last_modified = Time::parse(PropertyType::LastModifiedTime, object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("table has no last modified time".into())
    })?;
    let rows = ObjectReference::parse_vec(PropertyType::ElementChildNodes, object)?
        .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("table has no rows".into()))?;
    let row_count = simple::parse_u32(PropertyType::RowCount, object)?
        .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("table has no row count".into()))?;
    let col_count = simple::parse_u32(PropertyType::ColumnCount, object)?
        .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("table has no col count".into()))?;
    let cols_locked = simple::parse_vec(PropertyType::TableColumnsLocked, object)?
        .map(|value| value.into_iter().skip(1).collect())
        .unwrap_or_default();
    let col_widths = simple::parse_vec(PropertyType::TableColumnWidths, object)?
        .map(|value| {
            value
                .into_iter()
                .skip(1)
                .collect::<Vec<_>>()
                .chunks_exact(4)
                .map(|v| f32::from_le_bytes([v[0], v[1], v[2], v[3]]))
                .collect()
        })
        .unwrap_or_default();
    let borders_visible =
        simple::parse_bool(PropertyType::TableBordersVisible, object)?.unwrap_or(true);
    let layout_alignment_in_parent =
        LayoutAlignment::parse(PropertyType::LayoutAlignmentInParent, object)?;
    let layout_alignment_self = LayoutAlignment::parse(PropertyType::LayoutAlignmentSelf, object)?;

    let note_tags = NoteTagData::parse(object)?.unwrap_or_default();

    let data = Data {
        last_modified,
        rows,
        row_count,
        col_count,
        cols_locked,
        col_widths,
        borders_visible,
        layout_alignment_in_parent,
        layout_alignment_self,
        note_tags,
    };

    Ok(data)
}

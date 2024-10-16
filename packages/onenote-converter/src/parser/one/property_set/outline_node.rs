use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::layout_alignment::LayoutAlignment;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::outline_indent_distance::OutlineIndentDistance;
use crate::parser::one::property::time::Time;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// An outline group.
///
/// See [\[MS-ONE\] 2.2.20].
///
/// [\[MS-ONE\] 2.2.20]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/b25fa331-e07e-474e-99c9-b3603b7bf937
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) last_modified: Time,
    pub(crate) children: Vec<ExGuid>,
    pub(crate) child_level: u8,
    pub(crate) layout_max_height: Option<f32>,
    pub(crate) layout_max_width: Option<f32>,
    pub(crate) layout_reserved_width: Option<f32>,
    pub(crate) layout_minimum_outline_width: Option<f32>,
    pub(crate) layout_tight_alignment: bool,
    pub(crate) is_layout_size_set_by_user: bool,
    pub(crate) offset_from_parent_horiz: Option<f32>,
    pub(crate) offset_from_parent_vert: Option<f32>,
    pub(crate) list_spacing: Option<f32>,
    pub(crate) outline_indent_distance: OutlineIndentDistance,
    pub(crate) layout_alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) layout_alignment_self: Option<LayoutAlignment>,
    pub(crate) is_deletable: bool,
    pub(crate) is_title_date: bool,
    pub(crate) is_selectable: bool,
    pub(crate) is_title_text: bool,
    pub(crate) is_read_only: bool,
    pub(crate) descendants_cannot_be_moved: bool,
    pub(crate) tight_layout: bool,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::OutlineNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let last_modified = Time::parse(PropertyType::LastModifiedTime, object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("outline has no last modified time".into())
    })?;
    let children =
        ObjectReference::parse_vec(PropertyType::ElementChildNodes, object)?.unwrap_or_default();
    let child_level = simple::parse_u8(PropertyType::OutlineElementChildLevel, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("outline node has no child level".into())
        })?;

    let layout_max_height = simple::parse_f32(PropertyType::LayoutMaxHeight, object)?;
    let layout_reserved_width =
        simple::parse_f32(PropertyType::LayoutOutlineReservedWidth, object)?;
    let layout_minimum_outline_width =
        simple::parse_f32(PropertyType::LayoutMinimumOutlineWidth, object)?;
    let layout_max_width = simple::parse_f32(PropertyType::LayoutMaxWidth, object)?;
    let layout_tight_alignment =
        simple::parse_bool(PropertyType::LayoutTightAlignment, object)?.unwrap_or_default();

    let is_layout_size_set_by_user =
        simple::parse_bool(PropertyType::IsLayoutSizeSetByUser, object)?.unwrap_or_default();
    let list_spacing = simple::parse_f32(PropertyType::ListSpacingMu, object)?;
    let outline_indent_distance = OutlineIndentDistance::parse(object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("outline node has no outline indent distance".into())
    })?;
    let offset_from_parent_horiz = simple::parse_f32(PropertyType::OffsetFromParentHoriz, object)?;
    let offset_from_parent_vert = simple::parse_f32(PropertyType::OffsetFromParentVert, object)?;

    let layout_alignment_in_parent =
        LayoutAlignment::parse(PropertyType::LayoutAlignmentInParent, object)?;
    let layout_alignment_self = LayoutAlignment::parse(PropertyType::LayoutAlignmentSelf, object)?;

    let is_deletable = simple::parse_bool(PropertyType::Deletable, object)?.unwrap_or_default();
    let is_title_date = simple::parse_bool(PropertyType::IsTitleDate, object)?.unwrap_or_default();
    let is_selectable = simple::parse_bool(PropertyType::CannotBeSelected, object)?
        .map(|value| !value)
        .unwrap_or(true);
    let is_title_text = simple::parse_bool(PropertyType::IsTitleText, object)?.unwrap_or_default();
    let is_read_only = simple::parse_bool(PropertyType::IsReadOnly, object)?.unwrap_or_default();
    let descendants_cannot_be_moved =
        simple::parse_bool(PropertyType::DescendantsCannotBeMoved, object)?.unwrap_or_default();
    let tight_layout =
        simple::parse_bool(PropertyType::LayoutTightLayout, object)?.unwrap_or_default();

    let data = Data {
        last_modified,
        children,
        child_level,
        layout_max_height,
        layout_reserved_width,
        layout_minimum_outline_width,
        layout_max_width,
        layout_tight_alignment,
        is_layout_size_set_by_user,
        offset_from_parent_horiz,
        offset_from_parent_vert,
        list_spacing,
        outline_indent_distance,
        layout_alignment_in_parent,
        layout_alignment_self,
        is_deletable,
        is_title_date,
        is_selectable,
        is_title_text,
        is_read_only,
        descendants_cannot_be_moved,
        tight_layout,
    };

    Ok(data)
}

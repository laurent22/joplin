use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::layout_alignment::LayoutAlignment;
use crate::parser::one::property_set::{
    outline_element_node, outline_group, outline_node, PropertySetId,
};
use crate::parser::onenote::content::{parse_content, Content};
use crate::parser::onenote::list::{parse_list, List};
use crate::parser::onestore::object_space::ObjectSpace;

/// A content outline.
///
/// See [\[MS-ONE\] 1.3.2.1] and [\[MS-ONE\] 2.2.20].
///
/// [\[MS-ONE\] 1.3.2.1]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/22e65fbe-01db-4c3f-8b00-101a6cd6f9c4
/// [\[MS-ONE\] 2.2.20]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/b25fa331-e07e-474e-99c9-b3603b7bf937
#[derive(Clone, Debug)]
pub struct Outline {
    pub(crate) child_level: u8,
    pub(crate) list_spacing: Option<f32>,
    pub(crate) indents: Vec<f32>,

    pub(crate) alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) alignment_self: Option<LayoutAlignment>,

    pub(crate) layout_max_height: Option<f32>,
    pub(crate) layout_max_width: Option<f32>,
    pub(crate) layout_reserved_width: Option<f32>,
    pub(crate) layout_minimum_outline_width: Option<f32>,
    pub(crate) is_layout_size_set_by_user: bool,
    pub(crate) offset_horizontal: Option<f32>,
    pub(crate) offset_vertical: Option<f32>,

    pub(crate) items: Vec<OutlineItem>,
}

impl Outline {
    /// Contents of this outline.
    pub fn items(&self) -> &[OutlineItem] {
        &self.items
    }

    /// The nesting level of this outline's contents.
    ///
    /// See [\[MS-ONE\] 2.3.8].
    ///
    /// [\[MS-ONE\] 2.3.8]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/b631036a-9152-4385-8165-60fc324e5efd
    pub fn child_level(&self) -> u8 {
        self.child_level
    }

    /// The horizontal distance between a list index number or bullet and the outline content.
    ///
    /// See [\[MS-ONE\] 2.3.45].
    ///
    /// [\[MS-ONE\] 2.3.45]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/3139a52f-fc22-48a3-9765-cebc6774d109
    pub fn list_spacing(&self) -> Option<f32> {
        self.list_spacing
    }

    /// The indentation of each level in the outline.
    ///
    /// The contents are specified in [\[MS-ONE\] 2.2.2] but the semantics described there
    /// don't really match what the OneNote desktop and web applications seem to be doing.
    ///
    /// [\[MS-ONE\] 2.2.2]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/269a3e7b-d85a-4ba8-8e1d-d85e1c840772
    pub fn indents(&self) -> &[f32] {
        &self.indents
    }

    /// The outline's alignment relative to the parent element (if present).
    ///
    /// See [\[MS-ONE\] 2.3.27].
    ///
    /// [\[MS-ONE\] 2.3.27]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/61fa50be-c355-4b8d-ac01-761a2f7f66c0
    pub fn alignment_in_parent(&self) -> Option<LayoutAlignment> {
        self.alignment_in_parent
    }

    /// The outline's alignment.
    ///
    /// See [\[MS-ONE\] 2.3.33].
    ///
    /// [\[MS-ONE\] 2.3.33]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/4e7fe9db-2fdb-4239-b291-dc4b909c94ad
    pub fn alignment_self(&self) -> Option<LayoutAlignment> {
        self.alignment_self
    }

    /// The outline's max height in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.24].
    ///
    /// [\[MS-ONE\] 2.3.24]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/76ab7015-2c74-4783-8435-c68b17dd6882
    pub fn layout_max_height(&self) -> Option<f32> {
        self.layout_max_height
    }

    /// The outline's max width in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.22].
    ///
    /// [\[MS-ONE\] 2.3.22]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/a770ac4b-2225-4aa6-ba92-d3a51f97c405
    pub fn layout_max_width(&self) -> Option<f32> {
        self.layout_max_width
    }

    /// The outline's minimum width before the text wraps in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.46].
    ///
    /// [\[MS-ONE\] 2.3.46]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/e65a3ebc-da8b-4909-a423-b309e2457b36
    pub fn layout_reserved_width(&self) -> Option<f32> {
        self.layout_reserved_width
    }

    /// The outline's minimum width in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.49].
    ///
    /// [\[MS-ONE\] 2.3.49]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/ebeff222-f4e5-4c58-861c-e28b816d01ce
    pub fn layout_minimum_outline_width(&self) -> Option<f32> {
        self.layout_minimum_outline_width
    }

    /// Whether the [`layout_max_width()`](Self::layout_max_width()) value is set by the user.
    ///
    /// See [\[MS-ONE\] 2.3.44].
    ///
    /// [\[MS-ONE\] 2.3.44]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/19227b81-43ab-484c-aaae-d33cf13e2602
    pub fn is_layout_size_set_by_user(&self) -> bool {
        self.is_layout_size_set_by_user
    }

    /// The horizontal offset from the page origin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.18].
    ///
    /// [\[MS-ONE\] 2.3.18]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/5fb9e84a-c9e9-4537-ab14-e5512f24669a
    pub fn offset_horizontal(&self) -> Option<f32> {
        self.offset_horizontal
    }

    /// The vertical offset from the page origin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.19].
    ///
    /// [\[MS-ONE\] 2.3.19]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/5c4992ba-1db5-43e9-83dd-7299c562104d
    pub fn offset_vertical(&self) -> Option<f32> {
        self.offset_vertical
    }
}

/// An entry in an outline list.
#[allow(missing_docs)]
#[derive(Clone, Debug)]
pub enum OutlineItem {
    Group(OutlineGroup),
    Element(OutlineElement),
}

impl OutlineItem {
    /// Return the outline element if the item is an element.
    pub fn element(&self) -> Option<&OutlineElement> {
        if let OutlineItem::Element(element) = self {
            Some(element)
        } else {
            None
        }
    }
}

/// An outline group with a custom indentation level.
///
/// This is used to represent the case where the first [`OutlineElement`]
/// has a greater indentation level than the following outline elements.
///
/// See [\[MS-ONE\] 2.2.22].
///
/// [\[MS-ONE\] 2.2.22]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/7dcc1618-46ee-4912-b918-ab4df1b52315
#[derive(Clone, Debug)]
pub struct OutlineGroup {
    pub(crate) child_level: u8,
    pub(crate) outlines: Vec<OutlineItem>,
}

impl OutlineGroup {
    /// The nesting level of this outline group's contents.
    ///
    /// See [\[MS-ONE\] 2.3.8].
    ///
    /// [\[MS-ONE\] 2.3.8]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/b631036a-9152-4385-8165-60fc324e5efd
    pub fn child_level(&self) -> u8 {
        self.child_level
    }

    /// The contents of this outline group.
    pub fn outlines(&self) -> &[OutlineItem] {
        &self.outlines
    }
}

/// A container for a outline's content element.
///
/// See [\[MS-ONE\] 1.3.2.2] and [\[MS-ONE\] 2.2.21].
///
/// [\[MS-ONE\] 1.3.2.2]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/97bfd6bb-6ee4-43fd-aa1c-55646c0f6387
/// [\[MS-ONE\] 2.2.21]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/d47760a6-6f1f-4fd5-b2ad-a51fe5a72c21
#[derive(Clone, Debug)]
pub struct OutlineElement {
    pub(crate) contents: Vec<Content>,

    pub(crate) list_contents: Vec<List>,
    pub(crate) list_spacing: Option<f32>,

    pub(crate) child_level: u8,
    pub(crate) children: Vec<OutlineItem>,
}

impl OutlineElement {
    /// The outline element's contents.
    pub fn contents(&self) -> &[Content] {
        &self.contents
    }

    /// The list specification.
    ///
    /// From MS-ONE it's not really clear whether an outline element can have multiple
    /// list specifications so we're able to return multiple specifications just in case.
    ///
    /// See [\[MS-ONE\] 2.2.57].
    ///
    /// [\[MS-ONE\] 2.2.57]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/4c32f819-5885-4a53-bd2d-d020484c92ed
    pub fn list_contents(&self) -> &[List] {
        &self.list_contents
    }

    /// The horizontal distance between a list index number or bullet and the outline content.
    ///
    /// See [\[MS-ONE\] 2.3.45].
    ///
    /// [\[MS-ONE\] 2.3.45]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/3139a52f-fc22-48a3-9765-cebc6774d109
    pub fn list_spacing(&self) -> Option<f32> {
        self.list_spacing
    }

    /// The nesting level of this outline element's contents.
    ///
    /// See [\[MS-ONE\] 2.3.8].
    ///
    /// [\[MS-ONE\] 2.3.8]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/b631036a-9152-4385-8165-60fc324e5efd
    pub fn child_level(&self) -> u8 {
        self.child_level
    }

    /// Outline contents that are nested below this outline's contents.
    pub fn children(&self) -> &[OutlineItem] {
        &self.children
    }
}

pub(crate) fn parse_outline(outline_id: ExGuid, space: &ObjectSpace) -> Result<Outline> {
    let outline_object = space
        .get_object(outline_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("outline node is missing".into()))?;
    let data = outline_node::parse(outline_object)?;

    let items = data
        .children
        .into_iter()
        .map(|item_id| parse_outline_item(item_id, space))
        .collect::<Result<_>>()?;

    let outline = Outline {
        items,
        child_level: data.child_level,
        list_spacing: data.list_spacing,
        indents: data.outline_indent_distance.into_value(),
        alignment_in_parent: data.layout_alignment_in_parent,
        alignment_self: data.layout_alignment_self,
        layout_max_height: data.layout_max_height,
        layout_max_width: data.layout_max_width,
        layout_reserved_width: data.layout_reserved_width,
        layout_minimum_outline_width: data.layout_minimum_outline_width,
        is_layout_size_set_by_user: data.is_layout_size_set_by_user,
        offset_horizontal: data.offset_from_parent_horiz,
        offset_vertical: data.offset_from_parent_vert,
    };

    Ok(outline)
}

fn parse_outline_item(item_id: ExGuid, space: &ObjectSpace) -> Result<OutlineItem> {
    let content_type = space
        .get_object(item_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("outline item is missing".into()))?
        .id();
    let id = PropertySetId::from_jcid(content_type).ok_or_else(|| {
        ErrorKind::MalformedOneNoteData(
            format!("invalid property set id: 0x{:X}", content_type.0).into(),
        )
    })?;

    let item = match id {
        PropertySetId::OutlineGroup => OutlineItem::Group(parse_outline_group(item_id, space)?),
        PropertySetId::OutlineElementNode => {
            OutlineItem::Element(parse_outline_element(item_id, space)?)
        }
        _ => {
            return Err(ErrorKind::MalformedOneNoteData(
                format!("invalid outline item type: {:?}", id).into(),
            )
            .into())
        }
    };

    Ok(item)
}

fn parse_outline_group(group_id: ExGuid, space: &ObjectSpace) -> Result<OutlineGroup> {
    let group_object = space
        .get_object(group_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("outline group is missing".into()))?;
    let data = outline_group::parse(group_object)?;

    let outlines = data
        .children
        .into_iter()
        .map(|item_id| parse_outline_item(item_id, space))
        .collect::<Result<_>>()?;

    let group = OutlineGroup {
        child_level: data.child_level,
        outlines,
    };

    Ok(group)
}

pub(crate) fn parse_outline_element(
    element_id: ExGuid,
    space: &ObjectSpace,
) -> Result<OutlineElement> {
    let element_object = space
        .get_object(element_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("outline element is missing".into()))?;
    let data = outline_element_node::parse(element_object)?;

    let children = data
        .children
        .into_iter()
        .map(|item_id| parse_outline_item(item_id, space))
        .collect::<Result<_>>()?;

    let contents = data
        .contents
        .into_iter()
        .map(|content_id| parse_content(content_id, space))
        .collect::<Result<_>>()?;

    let list_contents = data
        .list_contents
        .into_iter()
        .map(|list_id| parse_list(list_id, space))
        .collect::<Result<_>>()?;

    let element = OutlineElement {
        child_level: data.child_level,
        list_spacing: data.list_spacing,
        children,
        contents,
        list_contents,
    };

    Ok(element)
}

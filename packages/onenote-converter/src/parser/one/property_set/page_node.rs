use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::author::Author;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::page_size::PageSize;
use crate::parser::one::property::time::Time;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// A page.
///
/// See [\[MS-ONE\] 2.2.19].
///
/// [\[MS-ONE\] 2.2.19]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/e381b7c7-b434-43a2-ba23-0d08bafd281a
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) last_modified: Option<Time>,
    pub(crate) cached_title: Option<String>,
    pub(crate) author: Option<Author>, // FIXME: Force this?
    pub(crate) content: Vec<ExGuid>,
    pub(crate) title: Option<ExGuid>,
    pub(crate) orientation_portrait: bool,
    pub(crate) page_width: Option<f32>,  // FIXME: Force this?
    pub(crate) page_height: Option<f32>, // FIXME: Force this?
    pub(crate) page_margin_origin_x: Option<f32>,
    pub(crate) page_margin_origin_y: Option<f32>,
    pub(crate) page_margin_left: Option<f32>, // FIXME: Force this?
    pub(crate) page_margin_right: Option<f32>, // FIXME: Force this?
    pub(crate) page_margin_top: Option<f32>,  // FIXME: Force this?
    pub(crate) page_margin_bottom: Option<f32>, // FIXME: Force this?
    pub(crate) page_size: PageSize,
    pub(crate) rtl: bool,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::PageNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let last_modified = Time::parse(PropertyType::LastModifiedTime, object)?;
    let cached_title = simple::parse_string(PropertyType::CachedTitleStringFromPage, object)?;
    let author = Author::parse(object)?;
    let content =
        ObjectReference::parse_vec(PropertyType::ElementChildNodes, object)?.unwrap_or_default();
    let title = ObjectReference::parse_vec(PropertyType::StructureElementChildNodes, object)?
        .unwrap_or_default()
        .first()
        .copied();
    let orientation_portrait =
        simple::parse_bool(PropertyType::PortraitPage, object)?.unwrap_or_default();
    let page_width = simple::parse_f32(PropertyType::PageWidth, object)?;
    let page_height = simple::parse_f32(PropertyType::PageHeight, object)?;
    let page_margin_origin_x = simple::parse_f32(PropertyType::PageMarginOriginX, object)?;
    let page_margin_origin_y = simple::parse_f32(PropertyType::PageMarginOriginY, object)?;
    let page_margin_left = simple::parse_f32(PropertyType::PageMarginLeft, object)?;
    let page_margin_right = simple::parse_f32(PropertyType::PageMarginRight, object)?;
    let page_margin_top = simple::parse_f32(PropertyType::PageMarginTop, object)?;
    let page_margin_bottom = simple::parse_f32(PropertyType::PageMarginBottom, object)?;
    let page_size = PageSize::parse(PropertyType::PageSize, object)?.unwrap_or_default();
    let rtl = simple::parse_bool(PropertyType::EditRootRtl, object)?.unwrap_or_default();

    let data = Data {
        last_modified,
        cached_title,
        author,
        content,
        title,
        orientation_portrait,
        page_width,
        page_height,
        page_margin_origin_x,
        page_margin_origin_y,
        page_margin_left,
        page_margin_right,
        page_margin_top,
        page_margin_bottom,
        page_size,
        rtl,
    };

    Ok(data)
}

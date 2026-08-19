use crate::one::property::object_reference::ObjectReference;
use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use crate::shared::exguid::ExGuid;
use parser_utils::errors::Result;

/// A section's table of contents.
///
/// See [\[MS-ONE\] 2.2.15].
///
/// [\[MS-ONE\] 2.2.15]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/6c1dd264-850b-4e46-af62-50b4dba49b62
#[derive(Debug)]
pub(crate) struct Data {
    pub(crate) children: Vec<ExGuid>,
    pub(crate) filename: Option<String>,
    pub(crate) ordering_id: Option<u32>,
    // FIXME: Color!?
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::TocContainer.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let children =
        ObjectReference::parse_vec(PropertyType::TocChildren, object)?.unwrap_or_default();
    let filename = simple::parse_string(PropertyType::FolderChildFilename, object)?
        .map(|s| s.replace("^M", "+"))
        .map(|s| s.replace("^J", ","));
    let ordering_id = simple::parse_u32(PropertyType::NotebookElementOrderingId, object)?;

    Ok(Data {
        children,
        filename,
        ordering_id,
    })
}

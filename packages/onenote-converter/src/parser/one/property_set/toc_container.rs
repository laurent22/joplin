use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

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
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
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

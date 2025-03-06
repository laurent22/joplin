use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::binary_item::BinaryItem;
use crate::parser::fsshttpb::data::cell_id::CellId;
use crate::parser::fsshttpb::data::compact_u64::CompactU64;
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::fsshttpb::data::object_types::ObjectType;
use crate::parser::fsshttpb::data::stream_object::ObjectHeader;
use crate::parser::fsshttpb::data_element::DataElement;
use crate::parser::Reader;
use std::fmt;

/// An object group.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.12.6]
///
/// [\[MS-FSSHTTPB\] 2.2.1.12.6]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/21404be6-0334-490e-80b5-82fccb9c04af
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct ObjectGroup {
    pub(crate) declarations: Vec<ObjectGroupDeclaration>,
    pub(crate) metadata: Vec<ObjectGroupMetadata>,
    pub(crate) objects: Vec<ObjectGroupData>,
}

/// An object group declaration.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.12.6.1]
///
/// [\[MS-FSSHTTPB\] 2.2.1.12.6.1]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/ef660e4b-a099-4e76-81f7-ed5c04a70caa
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) enum ObjectGroupDeclaration {
    Object {
        object_id: ExGuid,
        partition_id: u64,
        data_size: u64,
        object_reference_count: u64,
        cell_reference_count: u64,
    },
    Blob {
        object_id: ExGuid,
        blob_id: ExGuid,
        partition_id: u64,
        object_reference_count: u64,
        cell_reference_count: u64,
    },
}

impl ObjectGroupDeclaration {
    pub(crate) fn partition_id(&self) -> u64 {
        match self {
            ObjectGroupDeclaration::Object { partition_id, .. } => *partition_id,
            ObjectGroupDeclaration::Blob { partition_id, .. } => *partition_id,
        }
    }

    pub(crate) fn object_id(&self) -> ExGuid {
        match self {
            ObjectGroupDeclaration::Object { object_id, .. } => *object_id,
            ObjectGroupDeclaration::Blob { object_id, .. } => *object_id,
        }
    }
}

/// An object group's metadata.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.12.6.3] and [\[MS-FSSHTTPB\] 2.2.1.12.6.3.1]
///
/// [\[MS-FSSHTTPB\] 2.2.1.12.6.3]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/d35a8e21-e139-455c-a20b-3f47a5d9fb89
/// [\[MS-FSSHTTPB\] 2.2.1.12.6.3.1]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/507c6b42-2772-4319-b530-8fbbf4d34afd
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct ObjectGroupMetadata {
    pub(crate) change_frequency: ObjectChangeFrequency,
}

#[derive(Debug)]
pub(crate) enum ObjectChangeFrequency {
    Unknown = 0,
    Frequent = 1,
    Infrequent = 2,
    Independent = 3,
    Custom = 4,
}

impl ObjectChangeFrequency {
    fn parse(value: u64) -> ObjectChangeFrequency {
        match value {
            x if x == ObjectChangeFrequency::Unknown as u64 => ObjectChangeFrequency::Unknown,
            x if x == ObjectChangeFrequency::Frequent as u64 => ObjectChangeFrequency::Frequent,
            x if x == ObjectChangeFrequency::Infrequent as u64 => ObjectChangeFrequency::Infrequent,
            x if x == ObjectChangeFrequency::Independent as u64 => {
                ObjectChangeFrequency::Independent
            }
            x if x == ObjectChangeFrequency::Custom as u64 => ObjectChangeFrequency::Custom,
            x => panic!("unexpected change frequency: {}", x),
        }
    }
}

/// An object group's data.
pub(crate) enum ObjectGroupData {
    /// An object.
    ///
    /// See [\[MS-FSSHTTPB\] 2.2.1.12.6.4]
    ///
    /// [\[MS-FSSHTTPB\] 2.2.1.12.6.4]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/d542b89c-9e81-4af6-885a-47b2f9c1ce53
    Object {
        group: Vec<ExGuid>,
        cells: Vec<CellId>,
        data: Vec<u8>,
    },
    /// An excluded object.
    ///
    /// See [\[MS-FSSHTTPB\] 2.2.1.12.6.4]
    ///
    /// [\[MS-FSSHTTPB\] 2.2.1.12.6.4]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/d542b89c-9e81-4af6-885a-47b2f9c1ce53
    ObjectExcluded {
        group: Vec<ExGuid>,
        cells: Vec<CellId>,
        size: u64,
    },
    /// A blob reference.
    ///
    /// See [\[MS-FSSHTTPB\] 2.2.1.12.6.5]
    ///
    /// [\[MS-FSSHTTPB\] 2.2.1.12.6.5]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/9f73af5e-bd70-4703-8ec6-1866338f1b91
    BlobReference {
        objects: Vec<ExGuid>,
        cells: Vec<CellId>,
        blob: ExGuid,
    },
}

struct DebugSize(usize);

impl fmt::Debug for ObjectGroupData {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ObjectGroupData::Object { group, cells, data } => f
                .debug_struct("Object")
                .field("group", group)
                .field("cells", cells)
                .field("data", &DebugSize(data.len()))
                .finish(),
            ObjectGroupData::ObjectExcluded { group, cells, size } => f
                .debug_struct("ObjectExcluded")
                .field("group", group)
                .field("cells", cells)
                .field("size", size)
                .finish(),
            ObjectGroupData::BlobReference {
                objects,
                cells,
                blob,
            } => f
                .debug_struct("ObjectExcluded")
                .field("objects", objects)
                .field("cells", cells)
                .field("blob", blob)
                .finish(),
        }
    }
}

impl fmt::Debug for DebugSize {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} bytes", self.0)
    }
}

impl DataElement {
    pub(crate) fn parse_object_group(reader: Reader) -> Result<ObjectGroup> {
        let declarations = DataElement::parse_object_group_declarations(reader)?;

        let mut metadata = vec![];

        let object_header = ObjectHeader::parse(reader)?;
        match object_header.object_type {
            ObjectType::ObjectGroupMetadataBlock => {
                metadata = DataElement::parse_object_group_metadata(reader)?;

                // Parse object header for the group data section
                let object_header = ObjectHeader::parse(reader)?;
                if object_header.object_type != ObjectType::ObjectGroupData {
                    return Err(ErrorKind::MalformedFssHttpBData(
                        format!("unexpected object type: {:x}", object_header.object_type).into(),
                    )
                    .into());
                }
            }
            ObjectType::ObjectGroupData => {} // Skip, will be parsed below
            _ => {
                return Err(ErrorKind::MalformedFssHttpBData(
                    format!("unexpected object type: {:x}", object_header.object_type).into(),
                )
                .into())
            }
        }
        let objects = DataElement::parse_object_group_data(reader)?;

        ObjectHeader::try_parse_end_8(reader, ObjectType::DataElement)?;

        Ok(ObjectGroup {
            declarations,
            metadata,
            objects,
        })
    }

    fn parse_object_group_declarations(reader: Reader) -> Result<Vec<ObjectGroupDeclaration>> {
        ObjectHeader::try_parse(reader, ObjectType::ObjectGroupDeclaration)?;

        let mut declarations = vec![];

        loop {
            if ObjectHeader::has_end_8(reader, ObjectType::ObjectGroupDeclaration)? {
                break;
            }

            let object_header = ObjectHeader::parse(reader)?;
            match object_header.object_type {
                ObjectType::ObjectGroupObject => {
                    let object_id = ExGuid::parse(reader)?;
                    let partition_id = CompactU64::parse(reader)?.value();
                    let data_size = CompactU64::parse(reader)?.value();
                    let object_reference_count = CompactU64::parse(reader)?.value();
                    let cell_reference_count = CompactU64::parse(reader)?.value();

                    declarations.push(ObjectGroupDeclaration::Object {
                        object_id,
                        partition_id,
                        data_size,
                        object_reference_count,
                        cell_reference_count,
                    })
                }
                ObjectType::ObjectGroupDataBlob => {
                    let object_id = ExGuid::parse(reader)?;
                    let blob_id = ExGuid::parse(reader)?;
                    let partition_id = CompactU64::parse(reader)?.value();
                    let object_reference_count = CompactU64::parse(reader)?.value();
                    let cell_reference_count = CompactU64::parse(reader)?.value();

                    declarations.push(ObjectGroupDeclaration::Blob {
                        object_id,
                        blob_id,
                        partition_id,
                        object_reference_count,
                        cell_reference_count,
                    })
                }
                _ => {
                    return Err(ErrorKind::MalformedFssHttpBData(
                        format!("unexpected object type: {:x}", object_header.object_type).into(),
                    )
                    .into())
                }
            }
        }

        ObjectHeader::try_parse_end_8(reader, ObjectType::ObjectGroupDeclaration)?;

        Ok(declarations)
    }

    fn parse_object_group_metadata(reader: Reader) -> Result<Vec<ObjectGroupMetadata>> {
        let mut declarations = vec![];

        loop {
            if ObjectHeader::has_end_8(reader, ObjectType::ObjectGroupMetadataBlock)? {
                break;
            }

            ObjectHeader::try_parse_32(reader, ObjectType::ObjectGroupMetadata)?;

            let frequency = CompactU64::parse(reader)?;
            declarations.push(ObjectGroupMetadata {
                change_frequency: ObjectChangeFrequency::parse(frequency.value()),
            })
        }

        ObjectHeader::try_parse_end_8(reader, ObjectType::ObjectGroupMetadataBlock)?;

        Ok(declarations)
    }

    fn parse_object_group_data(reader: Reader) -> Result<Vec<ObjectGroupData>> {
        let mut objects = vec![];

        loop {
            if ObjectHeader::has_end_8(reader, ObjectType::ObjectGroupData)? {
                break;
            }

            let object_header = ObjectHeader::parse(reader)?;
            match object_header.object_type {
                ObjectType::ObjectGroupDataExcluded => {
                    let group = ExGuid::parse_array(reader)?;
                    let cells = CellId::parse_array(reader)?;
                    let size = CompactU64::parse(reader)?.value();

                    objects.push(ObjectGroupData::ObjectExcluded { group, cells, size })
                }
                ObjectType::ObjectGroupDataObject => {
                    let group = ExGuid::parse_array(reader)?;
                    let cells = CellId::parse_array(reader)?;
                    let data = BinaryItem::parse(reader)?.value();

                    objects.push(ObjectGroupData::Object { group, cells, data })
                }
                ObjectType::ObjectGroupBlobReference => {
                    let references = ExGuid::parse_array(reader)?;
                    let cells = CellId::parse_array(reader)?;
                    let blob = ExGuid::parse(reader)?;

                    objects.push(ObjectGroupData::BlobReference {
                        objects: references,
                        cells,
                        blob,
                    })
                }
                _ => {
                    return Err(ErrorKind::MalformedFssHttpBData(
                        format!("unexpected object type: {:x}", object_header.object_type).into(),
                    )
                    .into())
                }
            }
        }

        ObjectHeader::try_parse_end_8(reader, ObjectType::ObjectGroupData)?;

        Ok(objects)
    }
}

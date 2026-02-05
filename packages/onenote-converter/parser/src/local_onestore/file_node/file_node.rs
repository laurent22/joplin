use std::fmt::Debug;

use super::super::common::ObjectDeclarationWithRefCountBody;
use super::file_node_chunk_reference::FileNodeChunkReference;
use crate::local_onestore::common::FileChunkReference;
use crate::local_onestore::file_structure::{FileNodeList, ParseContext};
use crate::shared::compact_id::CompactId;
use crate::shared::exguid::ExGuid;
use crate::shared::file_data_ref::FileBlob;
use crate::shared::jcid::JcId;
use crate::shared::object_prop_set::ObjectPropSet;
use parser_utils::errors::ErrorKind;
use parser_utils::parse::{Parse, ParseWithCount};
use parser_utils::{Reader, Result};
use parser_utils::{Utf16ToString, log_warn};

use crate::shared::guid::Guid;

/// See [\[MS-ONESTORE\] 2.4.3](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/25a9b048-f91a-48d1-b803-137b7194e69e)
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct FileNode {
    /// Specifies the type of the structure
    node_type_id: u32,

    stp_format: u32,
    cb_format: u32,
    base_type: u32,
    pub size: usize,
    pub fnd: FileNodeData,
}

#[derive(Debug, Clone)]
enum FileNodeDataRef {
    SingleElement(FileNodeChunkReference),
    ElementList(FileNodeList),
    NoData,
    InvalidData,
}

impl FileNode {
    pub fn parse(reader: parser_utils::Reader, context: &mut ParseContext) -> Result<Self> {
        let remaining_0 = reader.remaining();
        let first_line = reader.get_u32()?;
        let node_id = first_line & 0x3FF; // First 10 bits
        let size = ((first_line >> 10) & 0x1FFF) as usize; // Next 13 bits
        let stp_format = (first_line >> 23) & 0x3; // Next 2 bits
        let cb_format = (first_line >> 25) & 0x3; // Next 2 bits
        let base_type = (first_line >> 27) & 0xF;
        // Last bit is reserved

        let data_ref = match base_type {
            0 => FileNodeDataRef::NoData, // Does not reference other data
            1 => FileNodeDataRef::SingleElement(FileNodeChunkReference::parse(
                reader, stp_format, cb_format,
            )?),
            2 => FileNodeDataRef::ElementList({
                let list_ref = FileNodeChunkReference::parse(reader, stp_format, cb_format)?;
                let mut resolved_reader = list_ref.resolve_to_reader(reader)?;
                FileNodeList::parse(&mut resolved_reader, context, list_ref.data_size())
            }?),
            _ => FileNodeDataRef::InvalidData,
        };
        let remaining_1 = reader.remaining();

        let fnd = match node_id {
            0x004 => {
                FileNodeData::ObjectSpaceManifestRootFND(ObjectSpaceManifestRootFND::parse(reader)?)
            }
            0x008 => FileNodeData::ObjectSpaceManifestListReferenceFND(
                ObjectSpaceManifestListReferenceFND::parse(reader, &data_ref)?,
            ),
            0x00C => FileNodeData::ObjectSpaceManifestListStartFND(
                ObjectSpaceManifestListStartFND::parse(reader)?,
            ),
            0x010 => FileNodeData::RevisionManifestListReferenceFND(
                RevisionManifestListReferenceFND::parse(reader, &data_ref)?,
            ),
            0x014 => FileNodeData::RevisionManifestListStartFND(
                RevisionManifestListStartFND::parse(reader)?,
            ),
            0x01B => {
                FileNodeData::RevisionManifestStart4FND(RevisionManifestStart4FND::parse(reader)?)
            }
            0x01C => FileNodeData::RevisionManifestEndFND,
            0x01E => {
                FileNodeData::RevisionManifestStart6FND(RevisionManifestStart6FND::parse(reader)?)
            }
            0x01F => {
                FileNodeData::RevisionManifestStart7FND(RevisionManifestStart7FND::parse(reader)?)
            }
            0x021 => FileNodeData::GlobalIdTableStartFNDX(GlobalIdTableStartFNDX::parse(reader)?),
            0x022 => FileNodeData::GlobalIdTableStart2FND,
            0x024 => FileNodeData::GlobalIdTableEntryFNDX(GlobalIdTableEntryFNDX::parse(reader)?),
            0x025 => FileNodeData::GlobalIdTableEntry2FNDX(GlobalIdTableEntry2FNDX::parse(reader)?),
            0x026 => FileNodeData::GlobalIdTableEntry3FNDX(GlobalIdTableEntry3FNDX::parse(reader)?),
            0x028 => FileNodeData::GlobalIdTableEndFNDX,
            0x02D => FileNodeData::ObjectDeclarationWithRefCountFNDX(
                ObjectDeclarationWithRefCountFNDX::parse(reader, &data_ref)?,
            ),
            0x02E => FileNodeData::ObjectDeclarationWithRefCount2FNDX(
                ObjectDeclarationWithRefCount2FNDX::parse(reader, &data_ref)?,
            ),
            0x041 => FileNodeData::ObjectRevisionWithRefCountFNDX(
                ObjectRevisionWithRefCountFNDX::parse(reader, &data_ref)?,
            ),
            0x042 => FileNodeData::ObjectRevisionWithRefCount2FNDX(
                ObjectRevisionWithRefCount2FNDX::parse(reader, &data_ref)?,
            ),
            0x059 => {
                FileNodeData::RootObjectReference2FNDX(RootObjectReference2FNDX::parse(reader)?)
            }
            0x05A => FileNodeData::RootObjectReference3FND(RootObjectReference3FND::parse(reader)?),
            0x05C => {
                FileNodeData::RevisionRoleDeclarationFND(RevisionRoleDeclarationFND::parse(reader)?)
            }
            0x05D => FileNodeData::RevisionRoleAndContextDeclarationFND(
                RevisionRoleAndContextDeclarationFND::parse(reader)?,
            ),
            0x072 => FileNodeData::ObjectDeclarationFileData3RefCountFND(
                ObjectDeclarationFileData3RefCountFND::parse(reader)?,
            ),
            0x073 => FileNodeData::ObjectDeclarationFileData3LargeRefCountFND(
                ObjectDeclarationFileData3LargeRefCountFND::parse(reader)?,
            ),
            0x07C => FileNodeData::ObjectDataEncryptionKeyV2FNDX(
                ObjectDataEncryptionKeyV2FNDX::parse(reader)?,
            ),
            0x084 => FileNodeData::ObjectInfoDependencyOverridesFND(
                ObjectInfoDependencyOverridesFND::parse(reader, &data_ref)?,
            ),
            0x08C => FileNodeData::DataSignatureGroupDefinitionFND(
                DataSignatureGroupDefinitionFND::parse(reader)?,
            ),
            0x090 => FileNodeData::FileDataStoreListReferenceFND(
                FileDataStoreListReferenceFND::parse(reader, &data_ref)?,
            ),
            0x094 => FileNodeData::FileDataStoreObjectReferenceFND(
                FileDataStoreObjectReferenceFND::parse(reader, &data_ref)?,
            ),
            0x0A4 => FileNodeData::ObjectDeclaration2RefCountFND(
                ObjectDeclaration2RefCountFND::parse(reader, &data_ref)?,
            ),
            0x0A5 => FileNodeData::ObjectDeclaration2LargeRefCountFND(
                ObjectDeclaration2LargeRefCountFND::parse(reader, &data_ref)?,
            ),
            0x0B0 => FileNodeData::ObjectGroupListReferenceFND(ObjectGroupListReferenceFND::parse(
                reader, &data_ref,
            )?),
            0x0B4 => FileNodeData::ObjectGroupStartFND(ObjectGroupStartFND::parse(reader)?),
            0x0B8 => FileNodeData::ObjectGroupEndFND,
            0x0C2 => FileNodeData::HashedChunkDescriptor2FND(HashedChunkDescriptor2FND::parse(
                reader, &data_ref,
            )?),
            0x0C4 => FileNodeData::ReadOnlyObjectDeclaration2RefCountFND(
                ReadOnlyObjectDeclaration2RefCountFND::parse(reader, &data_ref)?,
            ),
            0x0C5 => FileNodeData::ReadOnlyObjectDeclaration2LargeRefCountFND(
                ReadOnlyObjectDeclaration2LargeRefCountFND::parse(reader, &data_ref)?,
            ),
            0x0FF => FileNodeData::ChunkTerminatorFND,
            0 => FileNodeData::Null,
            other => {
                log_warn!("Unknown node type: {:#0x}, size {}", other, size);
                let size_used = remaining_0 - remaining_1;
                assert!(size_used <= size);
                let remaining_size = size - size_used;
                FileNodeData::UnknownNode(UnknownNode::parse(reader, remaining_size)?)
            }
        };

        let remaining_2 = reader.remaining();
        let actual_size = remaining_0 - remaining_2;

        let node = Self {
            node_type_id: node_id,
            stp_format,
            cb_format,
            base_type,
            size: actual_size,
            fnd,
        };

        // The stored size can be incorrect when node_id is zero
        if actual_size != size && node_id != 0 {
            println!(
                "Incorrect structure size: {:#?} (expected size {}, but was {})",
                node, size, actual_size
            );
            Err(ErrorKind::MalformedOneNoteFileData(
                format!(
                    "The size specified for this structure is incorrect. Was {}, expected {}. Id: {:#0x}",
                    actual_size, size, node_id
                )
                .into(),
            )
            .into())
        } else {
            Ok(node)
        }
    }
}

/// See [\[MS-ONESTORE\] 2.4.3](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/25a9b048-f91a-48d1-b803-137b7194e69e)
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum FileNodeData {
    ObjectSpaceManifestRootFND(ObjectSpaceManifestRootFND),
    ObjectSpaceManifestListReferenceFND(ObjectSpaceManifestListReferenceFND),
    ObjectSpaceManifestListStartFND(ObjectSpaceManifestListStartFND),
    RevisionManifestListReferenceFND(RevisionManifestListReferenceFND),
    RevisionManifestListStartFND(RevisionManifestListStartFND),
    RevisionManifestStart4FND(RevisionManifestStart4FND),
    RevisionManifestEndFND,
    RevisionManifestStart6FND(RevisionManifestStart6FND),
    RevisionManifestStart7FND(RevisionManifestStart7FND),
    GlobalIdTableStartFNDX(GlobalIdTableStartFNDX),
    GlobalIdTableStart2FND,
    GlobalIdTableEntryFNDX(GlobalIdTableEntryFNDX),
    GlobalIdTableEntry2FNDX(GlobalIdTableEntry2FNDX),
    GlobalIdTableEntry3FNDX(GlobalIdTableEntry3FNDX),
    GlobalIdTableEndFNDX,
    ObjectDeclarationWithRefCountFNDX(ObjectDeclarationWithRefCountFNDX),
    ObjectDeclarationWithRefCount2FNDX(ObjectDeclarationWithRefCount2FNDX),
    ObjectRevisionWithRefCountFNDX(ObjectRevisionWithRefCountFNDX),
    ObjectRevisionWithRefCount2FNDX(ObjectRevisionWithRefCount2FNDX),
    RootObjectReference2FNDX(RootObjectReference2FNDX),
    RootObjectReference3FND(RootObjectReference3FND),
    RevisionRoleDeclarationFND(RevisionRoleDeclarationFND),
    RevisionRoleAndContextDeclarationFND(RevisionRoleAndContextDeclarationFND),
    ObjectDeclarationFileData3RefCountFND(ObjectDeclarationFileData3RefCountFND),
    ObjectDeclarationFileData3LargeRefCountFND(ObjectDeclarationFileData3LargeRefCountFND),
    ObjectDataEncryptionKeyV2FNDX(ObjectDataEncryptionKeyV2FNDX),
    ObjectInfoDependencyOverridesFND(ObjectInfoDependencyOverridesFND),
    DataSignatureGroupDefinitionFND(DataSignatureGroupDefinitionFND),
    FileDataStoreListReferenceFND(FileDataStoreListReferenceFND),
    FileDataStoreObjectReferenceFND(FileDataStoreObjectReferenceFND),
    ObjectDeclaration2RefCountFND(ObjectDeclaration2RefCountFND),
    ObjectDeclaration2LargeRefCountFND(ObjectDeclaration2LargeRefCountFND),
    ObjectGroupListReferenceFND(ObjectGroupListReferenceFND),
    ObjectGroupStartFND(ObjectGroupStartFND),
    ObjectGroupEndFND,
    HashedChunkDescriptor2FND(HashedChunkDescriptor2FND),
    ReadOnlyObjectDeclaration2RefCountFND(ReadOnlyObjectDeclaration2RefCountFND),
    ReadOnlyObjectDeclaration2LargeRefCountFND(ReadOnlyObjectDeclaration2LargeRefCountFND),
    ChunkTerminatorFND,
    UnknownNode(UnknownNode),
    Null,
}

trait ParseWithRef
where
    Self: Sized,
{
    fn parse(reader: parser_utils::Reader, data_ref: &FileNodeDataRef) -> Result<Self>;
}

#[derive(Debug, Clone, Parse)]
pub struct ObjectSpaceManifestRootFND {
    pub gosid_root: ExGuid,
}

#[derive(Debug, Clone)]
pub struct ObjectSpaceManifestListReferenceFND {
    pub gosid: ExGuid,
    // Per [section 2.1.6](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/480f3f4d-1c13-4b58-9ee5-63919b17fb11),
    // - There is at least one revision in the list.
    // - All but the last revision must be ignored.
    pub last_revision: RevisionManifestListReferenceFND,
}

impl ParseWithRef for ObjectSpaceManifestListReferenceFND {
    fn parse(reader: parser_utils::Reader, data_ref: &FileNodeDataRef) -> Result<Self> {
        if let FileNodeDataRef::ElementList(data_ref) = data_ref {
            // Validation
            for (index, item) in data_ref.file_node_sequence.iter().enumerate() {
                if index == 0 {
                    if !matches!(item.fnd, FileNodeData::ObjectSpaceManifestListStartFND(_)) {
                        return Err(
                            ErrorKind::MalformedOneStoreData(
                                "ObjectSpaceManifestListReferenceFND's list must start with a ObjectSpaceManifestListStartFND.".into()
                            ).into()
                        );
                    }
                } else if !matches!(item.fnd, FileNodeData::RevisionManifestListReferenceFND(_)) {
                    return Err(
                        ErrorKind::MalformedOneStoreData(
                            "All items following the first in an ObjectSpaceManifestListReferenceFND must be RevisionManifestListReferenceFNDs.".into()
                        ).into()
                    );
                }
            }

            let last_revision =
                data_ref
                    .file_node_sequence
                    .iter()
                    .rev()
                    .find_map(|node| match &node.fnd {
                        FileNodeData::RevisionManifestListReferenceFND(revision) => Some(revision),
                        _ => None,
                    });
            if let Some(last_revision) = last_revision {
                Ok(Self {
                    gosid: ExGuid::parse(reader)?,
                    last_revision: last_revision.clone(),
                })
            } else {
                Err(
                    ErrorKind::MalformedOneStoreData(
                        "ObjectSpaceManifestListReferenceFND must point to a list with at least one revision".into()
                    ).into()
                )
            }
        } else {
            Err(ErrorKind::MalformedOneStoreData(
                "ObjectSpaceManifestListReferenceFND must point to a list of elements".into(),
            )
            .into())
        }
    }
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct ObjectSpaceManifestListStartFND {
    gsoid: ExGuid,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct PointerToListFND {
    pub list: FileNodeList,
}

impl ParseWithRef for PointerToListFND {
    fn parse(_reader: parser_utils::Reader, data_ref: &FileNodeDataRef) -> Result<Self> {
        match data_ref {
            FileNodeDataRef::ElementList(list) => Ok(Self { list: list.clone() }),
            other => Err(onestore_parse_error!("Expected a list, got {:?}", other).into()),
        }
    }
}

/// See [MS-ONESTORE 2.1.10](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/14af4d81-c2d6-43e6-8bd4-508d4123fb22)
pub type RevisionManifestListReferenceFND = PointerToListFND;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct RevisionManifestListStartFND {
    pub gsoid: ExGuid,
    n_instance: u32,
}

impl Parse for RevisionManifestListStartFND {
    fn parse(reader: parser_utils::Reader) -> Result<Self> {
        Ok(Self {
            gsoid: ExGuid::parse(reader)?,
            n_instance: reader.get_u32()?,
        })
    }
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct RevisionManifestStart4FND {
    pub rid: ExGuid,
    pub rid_dependent: ExGuid,
    reserved_time_creation: u64,
    revision_role: u32,
    odcs_default: u16,
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct RevisionManifestStart6FND {
    pub rid: ExGuid,
    /// ID of a dependency revision
    pub rid_dependent: ExGuid,
    revision_role: u32,
    odcs_default: u16,
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct RevisionManifestStart7FND {
    pub base: RevisionManifestStart6FND,
    gctxid: ExGuid,
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct GlobalIdTableStartFNDX {
    reserved: u8,
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct GlobalIdTableEntryFNDX {
    pub index: u32,
    pub guid: Guid,
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct GlobalIdTableEntry2FNDX {
    pub i_index_map_from: u32,
    pub i_index_map_to: u32,
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct GlobalIdTableEntry3FNDX {
    i_index_copy_from_start: u32,
    c_entries_to_copy: u32,
    i_index_copy_to_start: u32,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ObjectDeclarationWithSizedRefCount<RefSize: Parse> {
    body: ObjectDeclarationWithRefCountBody,
    c_ref: RefSize,
    property_set: ObjectPropSet,
}

impl<RefSize: Parse> ObjectDeclarationNode for ObjectDeclarationWithSizedRefCount<RefSize> {
    fn get_jcid(&self) -> JcId {
        self.body.jcid(true)
    }

    fn get_compact_id(&self) -> CompactId {
        self.body.oid
    }

    fn get_props(&self) -> Option<&ObjectPropSet> {
        Some(&self.property_set)
    }
}

impl<RefSize: Parse> ParseWithRef for ObjectDeclarationWithSizedRefCount<RefSize> {
    fn parse(reader: Reader, data_ref: &FileNodeDataRef) -> Result<Self> {
        let property_set = read_property_set(reader, data_ref)?;
        Ok(Self {
            body: ObjectDeclarationWithRefCountBody::parse(reader)?,
            c_ref: RefSize::parse(reader)?,
            property_set,
        })
    }
}

fn read_property_set(reader: Reader, property_set_ref: &FileNodeDataRef) -> Result<ObjectPropSet> {
    match property_set_ref {
        FileNodeDataRef::SingleElement(data_ref) => {
            let mut prop_set_reader = data_ref.resolve_to_reader(reader)?;
            let prop_set = ObjectPropSet::parse(&mut prop_set_reader)?;
            Ok(prop_set)
        }
        FileNodeDataRef::ElementList(_) => Err(ErrorKind::MalformedOneStoreData(
            "Expected a single element (reading PropertySet)".into(),
        )
        .into()),
        _ => Err(
            ErrorKind::MalformedOneStoreData("Expected a reference to a property set".into())
                .into(),
        ),
    }
}

pub type ObjectDeclarationWithRefCountFNDX = ObjectDeclarationWithSizedRefCount<u8>;
pub type ObjectDeclarationWithRefCount2FNDX = ObjectDeclarationWithSizedRefCount<u32>;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ObjectRevisionWithRefCountFNDX {
    oid: CompactId,
    f_has_oid_references: bool,
    f_has_osid_references: bool,
    property_set: ObjectPropSet,
    c_ref: u8,
}

impl ParseWithRef for ObjectRevisionWithRefCountFNDX {
    fn parse(reader: parser_utils::Reader, data_ref: &FileNodeDataRef) -> Result<Self> {
        let property_set = read_property_set(reader, data_ref)?;
        let oid = CompactId::parse(reader)?;
        let metadata = reader.get_u8()?;
        Ok(Self {
            oid,
            f_has_oid_references: metadata & 0x1 > 0,
            f_has_osid_references: metadata & 0x2 > 0,
            c_ref: (metadata & 0b1111_1100) >> 2,
            property_set,
        })
    }
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ObjectRevisionWithRefCount2FNDX {
    oid: CompactId,
    f_has_oid_references: bool,
    f_has_osid_references: bool,
    property_set: ObjectPropSet,
    c_ref: u32,
}

impl ParseWithRef for ObjectRevisionWithRefCount2FNDX {
    fn parse(reader: parser_utils::Reader, data_ref: &FileNodeDataRef) -> Result<Self> {
        let property_set = read_property_set(reader, data_ref)?;
        let oid = CompactId::parse(reader)?;
        let metadata = reader.get_u32()?;
        Ok(Self {
            oid,
            f_has_oid_references: metadata & 0x1 > 0,
            f_has_osid_references: metadata & 0x2 > 0,
            c_ref: reader.get_u32()?,
            property_set,
        })
    }
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct RootObjectReference2FNDX {
    pub oid_root: CompactId,
    pub root_role: u32,
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct RootObjectReference3FND {
    pub oid_root: ExGuid,
    pub root_role: u32,
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct RevisionRoleDeclarationFND {
    pub rid: ExGuid,
    /// "should be 0x01"
    revision_role: u32,
}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct RevisionRoleAndContextDeclarationFND {
    /// Revision role & pointer to the revision
    pub base: RevisionRoleDeclarationFND,
    /// The revision context
    pub gctxid: ExGuid,
}

/// See [\[MS-ONESTORE\] 2.2.3](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/af15f3eb-f2a8-4333-8d04-e05e55c2af07)
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct StringInStorageBuffer {
    cch: usize,
    data: String,
}

impl Parse for StringInStorageBuffer {
    fn parse(reader: Reader) -> Result<Self> {
        let characer_count = reader.get_u32()? as usize;
        let string_size = characer_count * 2; // 2 bytes per character
        let data = reader.read(string_size)?;
        let data = data.utf16_to_string()?;
        Ok(Self {
            cch: characer_count,
            data,
        })
    }
}

/// See [\[MS-ONESTORE\] 2.5.27](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/da2bbc7d-0529-4bf4-a843-6f3f55c87e8f)
#[derive(Debug, Clone, Parse)]
#[validate({
    let data = &file_data_ref.data;
    data.starts_with("<file>") || data.starts_with("<ifndf>") || data.starts_with("<invfdo>")
})]
#[allow(dead_code)]
pub struct ObjectDeclarationFileDataRefCount<RefSize: Parse> {
    oid: CompactId,
    jcid: JcId,
    #[assert_offset(8)]
    c_ref: RefSize,
    file_data_ref: StringInStorageBuffer,
    file_ext: StringInStorageBuffer,
}

impl<RefSize: Parse> ObjectDeclarationNode for ObjectDeclarationFileDataRefCount<RefSize> {
    fn get_jcid(&self) -> JcId {
        self.jcid
    }

    fn get_compact_id(&self) -> CompactId {
        self.oid
    }

    fn get_props(&self) -> Option<&ObjectPropSet> {
        None
    }

    fn get_attachment_info(&self) -> Option<AttachmentInfo> {
        Some(AttachmentInfo {
            data_ref: self.file_data_ref.data.clone(),
            extension: self.file_ext.data.clone(),
        })
    }
}

pub type ObjectDeclarationFileData3RefCountFND = ObjectDeclarationFileDataRefCount<u8>;
pub type ObjectDeclarationFileData3LargeRefCountFND = ObjectDeclarationFileDataRefCount<u32>;

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct ObjectRefAndId<Id: Parse> {
    id: Id,
}

/// Points to encrypted data. See [\[MS-ONESTORE\] 2.5.19](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/542f09eb-9db8-4b6a-86e5-2d9a930b41c0).
#[derive(Debug, Clone, Parse)]
pub struct ObjectDataEncryptionKeyV2FNDX {}

#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
struct ObjectInfoDependencyOverride<RefSize: Parse> {
    oid: CompactId,
    c_ref: RefSize,
}

/// See [\[MS-ONESTORE\] 2.6.10](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/af821117-689f-42cf-8136-c72c1e238f1e)
#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
struct ObjectInfoDependencyOverrideData {
    c8_override_count: u32,
    c32_override_count: u32,
    crc: u32,
    #[parse_additional_args(c8_override_count as usize)]
    overrides1: Vec<ObjectInfoDependencyOverride<u8>>,
    #[parse_additional_args(c32_override_count as usize)]
    overrides2: Vec<ObjectInfoDependencyOverride<u32>>,
}

/// See [\[MS-ONESTORE\] 2.5.20](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/80125c83-199e-43b9-9a13-4085752eddac)
/// Specifies reference counts for objects.
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ObjectInfoDependencyOverridesFND {
    data: ObjectInfoDependencyOverrideData,
}

impl ParseWithRef for ObjectInfoDependencyOverridesFND {
    fn parse(reader: parser_utils::Reader, obj_ref: &FileNodeDataRef) -> Result<Self> {
        if let FileNodeDataRef::SingleElement(obj_ref) = obj_ref {
            if !obj_ref.is_fcr_nil() {
                let data = ObjectInfoDependencyOverrideData::parse(
                    &mut obj_ref.resolve_to_reader(reader)?,
                )?;
                Ok(Self { data })
            } else {
                Ok(Self {
                    data: ObjectInfoDependencyOverrideData::parse(reader)?,
                })
            }
        } else {
            Err(ErrorKind::MalformedOneStoreData(
                "Missing ref to data (parsing ObjectInfoDependencyOverridesFND)".into(),
            )
            .into())
        }
    }
}

/// Terminates ObjectGroupEndFND, DataSignatureGroupDefinitionFND, and RevisionManifestEndFND.
/// See [\[MS-ONESTORE\] 2.5.33](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/0fa4c886-011a-4c19-9651-9a69e43a19c6)
#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct DataSignatureGroupDefinitionFND {
    data_signature_group: ExGuid,
}

/// See [\[MS-ONESTORE\] 2.5.21](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/2701cc42-3601-49f9-a3ba-7c40cd8a2be9)
pub type FileDataStoreListReferenceFND = PointerToListFND;

/// See [\[MS-ONESTORE\] 2.6.13](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/8806fd18-6735-4874-b111-227b83eaac26)
#[derive(Debug, Parse, Clone)]
#[validate(guid_header == Guid::from_str("{BDE316E7-2665-4511-A4C4-8D4D0B7A9EAC}").unwrap())]
#[validate(guid_footer == Guid::from_str("{71FBA722-0F79-4A0B-BB13-899256426B24}").unwrap())]
#[allow(unused)]
pub struct FileDataStoreObject {
    guid_header: Guid,
    /// Length of the file data (without padding)
    cb_length: u64,
    _unused: u32,
    _reserved: u64,
    #[parse_additional_args(cb_length as usize)]
    #[pad_to_alignment(8)]
    pub file_data: FileData,
    guid_footer: Guid,
}

#[derive(Clone)]
pub struct FileData(pub FileBlob);

impl Debug for FileData {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "FileData(size={:} KiB)", self.0.as_ref().len() / 1024)
    }
}

impl ParseWithCount for FileData {
    fn parse(reader: parser_utils::Reader, size: usize) -> Result<Self> {
        let data = reader.read(size)?.to_vec();
        Ok(FileData(data.into()))
    }
}

/// See [\[MS-ONESTORE\] 2.5.22](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/6f6d5729-ad03-420f-b8fa-7683751218b3)
#[derive(Debug, Clone)]
pub struct FileDataStoreObjectReferenceFND {
    pub target: FileDataStoreObject,
    pub guid: Guid,
}

impl ParseWithRef for FileDataStoreObjectReferenceFND {
    fn parse(reader: parser_utils::Reader, data_ref: &FileNodeDataRef) -> Result<Self> {
        let guid = Guid::parse(reader)?;
        if let FileNodeDataRef::SingleElement(data_ref) = data_ref {
            let mut reader = data_ref.resolve_to_reader(reader)?;
            Ok(Self {
                target: FileDataStoreObject::parse(&mut reader)?,
                guid,
            })
        } else {
            Err(onestore_parse_error!(
                "FileDataStoreObjectReferenceFND should point to a single file node object"
            )
            .into())
        }
    }
}

#[derive(Debug, Clone)]
pub struct AttachmentInfo {
    extension: String,
    data_ref: String,
}

impl AttachmentInfo {
    pub fn load_data<F>(&self, file_blob_by_id: F) -> Result<FileBlob>
    where
        F: FnOnce(&str) -> Result<FileBlob>,
    {
        // See https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/da2bbc7d-0529-4bf4-a843-6f3f55c87e8f
        if self.data_ref.starts_with("<ifndf>") {
            file_blob_by_id(&self.data_ref["<ifndf>".len()..])
        } else if self.data_ref.starts_with("<file>") {
            // An external file reference
            // TODO: Find a test .one file that uses this and implement it.
            Err(parser_error!(
                ResolutionFailed,
                "Not supported: Loading an attachment from a file: {} (ext: {})",
                self.data_ref,
                self.extension,
            )
            .into())
        } else if self.data_ref.starts_with("<invfdo>") {
            // "invalid"
            log_warn!("Attempted to load an invalid {} file. Importing an empty file.", self.extension);
            // Return empty data
            Ok(FileBlob::default())
        } else {
            Err(parser_error!(
                ResolutionFailed,
                "Failed to resolve file reference: {} (ext: {})",
                self.data_ref,
                self.extension
            )
            .into())
        }
    }
}

/// Common functionality available for most nodes that declare objects
pub trait ObjectDeclarationNode {
    fn get_jcid(&self) -> JcId;
    fn get_compact_id(&self) -> CompactId;
    fn get_props(&self) -> Option<&ObjectPropSet>;
    fn get_attachment_info(&self) -> Option<AttachmentInfo> {
        None
    }
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
struct ObjectDeclaration2Body {
    /// The object ID
    oid: CompactId,
    /// Specifies the object type
    jcid: JcId,
    f_has_oid_references: bool,
    f_has_osid_references: bool,
}

impl Parse for ObjectDeclaration2Body {
    fn parse(reader: parser_utils::Reader) -> Result<Self> {
        let oid = CompactId::parse(reader)?;
        let jcid = JcId::parse(reader)?;
        let metadata = reader.get_u8()?;
        Ok(Self {
            oid,
            jcid,
            f_has_oid_references: metadata & 0x1 > 0,
            f_has_osid_references: metadata & 0x2 > 0,
        })
    }
}

/// See [\[MS-ONESTORE\] 2.5.25](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/a6ea1707-b205-4cd8-be40-d4c3462b226b)
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ObjectDeclaration2RefCount<RefSize: Parse> {
    props: ObjectPropSet,
    body: ObjectDeclaration2Body,
    c_ref: RefSize,
}

impl<RefSize: Parse> ObjectDeclarationNode for ObjectDeclaration2RefCount<RefSize> {
    fn get_jcid(&self) -> JcId {
        self.body.jcid
    }
    fn get_props(&self) -> Option<&ObjectPropSet> {
        Some(&self.props)
    }
    fn get_compact_id(&self) -> CompactId {
        self.body.oid
    }
}

impl<RefSize: Parse> ParseWithRef for ObjectDeclaration2RefCount<RefSize> {
    fn parse(reader: parser_utils::Reader, property_set_ref: &FileNodeDataRef) -> Result<Self> {
        Ok(Self {
            props: read_property_set(reader, property_set_ref)?,
            body: ObjectDeclaration2Body::parse(reader)?,
            c_ref: RefSize::parse(reader)?,
        })
    }
}

pub type ObjectDeclaration2RefCountFND = ObjectDeclaration2RefCount<u8>;
pub type ObjectDeclaration2LargeRefCountFND = ObjectDeclaration2RefCount<u32>;

#[allow(unused)]
#[derive(Debug, Clone)]
pub struct ObjectGroupListReferenceFND {
    pub list: FileNodeList,
    pub id: ExGuid,
}

impl ParseWithRef for ObjectGroupListReferenceFND {
    fn parse(reader: parser_utils::Reader, data_ref: &FileNodeDataRef) -> Result<Self> {
        match data_ref {
            FileNodeDataRef::ElementList(list) => Ok(Self {
                list: list.clone(),
                id: ExGuid::parse(reader)?,
            }),
            other => Err(parser_error!(
                MalformedOneStoreData,
                "Expected a list (parsing ObjectGroupListReferenceFND), got {:?}",
                other
            )
            .into()),
        }
    }
}

/// See [MS-ONESTORE 2.5.32](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/2b639cb8-1185-4f63-82cb-0f3e4106611e)
#[derive(Debug, Clone, Parse)]
#[allow(dead_code)]
pub struct ObjectGroupStartFND {
    /// The ID of the object group
    pub oid: ExGuid,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct HashedChunkDescriptor<Hash: Parse> {
    prop_set: ObjectPropSet,
    hash: Hash,
}

impl<Hash: Parse> ParseWithRef for HashedChunkDescriptor<Hash> {
    fn parse(reader: Reader, prop_ref: &FileNodeDataRef) -> Result<Self> {
        let prop_set = read_property_set(reader, prop_ref)?;
        Ok(Self {
            prop_set,
            hash: Hash::parse(reader)?,
        })
    }
}

type HashedChunkDescriptor2FND = HashedChunkDescriptor<u128>;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ReadOnlyObjectDeclaration2RefCount<Base> {
    pub base: Base,
    md5_hash: u128,
}

impl<Base: ParseWithRef> ParseWithRef for ReadOnlyObjectDeclaration2RefCount<Base> {
    fn parse(reader: parser_utils::Reader, prop_ref: &FileNodeDataRef) -> Result<Self> {
        Ok(Self {
            base: Base::parse(reader, prop_ref)?,
            md5_hash: u128::parse(reader)?,
        })
    }
}

impl<Base: ObjectDeclarationNode> ObjectDeclarationNode
    for ReadOnlyObjectDeclaration2RefCount<Base>
{
    fn get_jcid(&self) -> JcId {
        self.base.get_jcid()
    }
    fn get_props(&self) -> Option<&ObjectPropSet> {
        self.base.get_props()
    }
    fn get_compact_id(&self) -> CompactId {
        self.base.get_compact_id()
    }
}

pub type ReadOnlyObjectDeclaration2RefCountFND =
    ReadOnlyObjectDeclaration2RefCount<ObjectDeclaration2RefCountFND>;
pub type ReadOnlyObjectDeclaration2LargeRefCountFND =
    ReadOnlyObjectDeclaration2RefCount<ObjectDeclaration2LargeRefCountFND>;

#[derive(Debug, Clone)]
pub struct UnknownNode {}

impl ParseWithCount for UnknownNode {
    fn parse(reader: Reader, size: usize) -> Result<Self> {
        reader.advance(size)?;
        Ok(UnknownNode {})
    }
}

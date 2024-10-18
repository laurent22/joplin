use enum_primitive_derive::Primitive;
use num_traits::ToPrimitive;
use std::fmt;

/// Stream object types.
///
/// While the FSSHTTPB protocol specified more object types than listed here, we only need a limited
/// number of them to parse OneNote files stored in FSSHTTPB format.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.5.1] and [\[MS-FSSHTTPB\] 2.2.1.5.2].
///
/// [\[MS-FSSHTTPB\] 2.2.1.5.1]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/a1017f48-a888-49ff-b71d-cc3c707f753a
/// [\[MS-FSSHTTPB\] 2.2.1.5.2]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/ac629d63-60a1-49b2-9db2-fa3c19971cc9
#[derive(Debug, Primitive, PartialEq)]
pub enum ObjectType {
    CellManifest = 0x0B,
    DataElement = 0x01,
    DataElementFragment = 0x06A,
    DataElementPackage = 0x15,
    ObjectDataBlob = 0x02,
    ObjectGroupBlobReference = 0x1C,
    ObjectGroupData = 0x1E,
    ObjectGroupDataBlob = 0x05,
    ObjectGroupDataExcluded = 0x03,
    ObjectGroupDataObject = 0x16,
    ObjectGroupDeclaration = 0x1D,
    ObjectGroupMetadata = 0x078,
    ObjectGroupMetadataBlock = 0x79,
    ObjectGroupObject = 0x18,
    /// An indicator that the object contains a OneNote packing object.
    ///
    /// See [\[MS-ONESTORE\] 2.8.1] (look for _Packaging Start_)
    ///
    /// [\[MS-ONESTORE\] 2.8.1]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/a2f046ea-109a-49c4-912d-dc2888cf0565
    OneNotePackaging = 0x7a,
    RevisionManifest = 0x1A,
    RevisionManifestGroupReference = 0x19,
    RevisionManifestRoot = 0x0A,
    StorageIndexCellMapping = 0x0E,
    StorageIndexManifestMapping = 0x11,
    StorageIndexRevisionMapping = 0x0D,
    StorageManifest = 0x0C,
    StorageManifestRoot = 0x07,
}

impl fmt::LowerHex for ObjectType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let value = self.to_u64().unwrap();
        fmt::LowerHex::fmt(&value, f)
    }
}

use crate::parser::fsshttpb::data::cell_id::CellId;
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::onestore::types::compact_id::CompactId;
use std::collections::HashMap;

/// The ID mapping table for an object.
///
/// The specification isn't really clear on how the mapping table works. According to the spec,
/// the mapping table maps from `CompactId`s to `ExGuid`s for objects and `CellId`s for object
/// spaces. BUT while it specifies how to build the mapping table, it doesn't mention how it
/// is used. From testing it looks like there cases where a single `CompactId` maps to *multiple*
/// `ExGuid`s/`CellId`s. In this case we will use the table _index_ as a fallback.
///
/// See [\[MS-ONESTORE\] 2.7.8].
///
/// [\[MS-ONESTORE\] 2.7.8]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/c2e58ac6-7a86-4009-a1e4-4a84cd21508f
#[derive(Debug, Clone)]
pub(crate) struct MappingTable {
    objects: HashMap<CompactId, Vec<(usize, ExGuid)>>,
    object_spaces: HashMap<CompactId, Vec<(usize, CellId)>>,
}

impl MappingTable {
    pub fn fallback() -> MappingTable {
        return MappingTable {
            objects: HashMap::from([]),
            object_spaces: HashMap::from([]),
        };
    }

    pub(crate) fn from_entries<
        I: Iterator<Item = (CompactId, ExGuid)>,
        J: Iterator<Item = (CompactId, CellId)>,
    >(
        objects: I,
        object_spaces: J,
    ) -> MappingTable {
        let mut objects_map: HashMap<CompactId, Vec<(usize, ExGuid)>> = HashMap::new();
        for (i, (cid, id)) in objects.enumerate() {
            objects_map.entry(cid).or_default().push((i, id));
        }

        let mut object_spaces_map: HashMap<CompactId, Vec<(usize, CellId)>> = HashMap::new();
        for (i, (cid, id)) in object_spaces.enumerate() {
            object_spaces_map.entry(cid).or_default().push((i, id));
        }

        MappingTable {
            objects: objects_map,
            object_spaces: object_spaces_map,
        }
    }

    pub(crate) fn get_object(&self, index: usize, cid: CompactId) -> Option<ExGuid> {
        self.get(index, cid, &self.objects)
    }

    pub(crate) fn get_object_space(&self, index: usize, cid: CompactId) -> Option<CellId> {
        self.get(index, cid, &self.object_spaces)
    }

    fn get<T: Copy>(
        &self,
        index: usize,
        cid: CompactId,
        table: &HashMap<CompactId, Vec<(usize, T)>>,
    ) -> Option<T> {
        if let Some(entries) = table.get(&cid) {
            // Only one entry: return it!
            if let [(_, id)] = &**entries {
                return Some(*id);
            }

            // Find entry with matching table index
            if let Some((_, id)) = entries.iter().find(|(i, _)| *i == index) {
                return Some(*id);
            }
        }

        None
    }
}

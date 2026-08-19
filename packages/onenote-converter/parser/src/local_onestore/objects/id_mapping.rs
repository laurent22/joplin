use crate::shared::{compact_id::CompactId, exguid::ExGuid, guid::Guid};
use parser_utils::errors::Result;
use std::{collections::HashMap, fmt::Debug};

/// A subset of the global ID table that applies to a particular range of nodes.
/// Maps from GUID index -> GUID. The other part of the full ID is stored directly
/// in each CompactId.
#[derive(Clone)]
pub struct IdMapping(HashMap<u32, Guid>);

impl Debug for IdMapping {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "IdMapping(entry count: {:})", self.0.len())
    }
}

impl IdMapping {
    pub fn new() -> Self {
        IdMapping(HashMap::new())
    }

    pub fn resolve_id(&self, id: &CompactId) -> Result<ExGuid> {
        let guid = self.0.get(&id.guid_index).ok_or(parser_error!(
            ResolutionFailed,
            "Missing mapping for ID (index: {})",
            id.guid_index
        ))?;

        Ok(ExGuid::from_guid(*guid, id.n.into()))
    }

    pub fn add_mapping(&mut self, guid_index: u32, guid: Guid) {
        self.0.insert(guid_index, guid);
    }
}

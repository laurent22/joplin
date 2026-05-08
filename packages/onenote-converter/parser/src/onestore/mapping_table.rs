use crate::shared::{cell_id::CellId, compact_id::CompactId, exguid::ExGuid};
use std::{fmt, rc::Rc};

pub trait MappingTable {
    fn resolve_id(&self, index: usize, cid: &CompactId) -> Option<ExGuid>;
    fn get_object_space(&self, index: usize, cid: &CompactId) -> Option<CellId>;
}

impl fmt::Debug for dyn MappingTable {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[MappingTable]")
    }
}

struct FallbackMappingTable {}

impl MappingTable for FallbackMappingTable {
    fn resolve_id(&self, _index: usize, _cid: &CompactId) -> Option<ExGuid> {
        None
    }

    fn get_object_space(&self, _index: usize, _cid: &CompactId) -> Option<CellId> {
        None
    }
}

pub fn mapping_table_fallback() -> Rc<dyn MappingTable> {
    Rc::new(FallbackMappingTable {})
}

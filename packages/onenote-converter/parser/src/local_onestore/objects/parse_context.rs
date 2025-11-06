use parser_utils::errors::Result;
use std::{cell::RefCell, rc::Rc};

use crate::{
    local_onestore::{
        file_node::file_node::AttachmentInfo,
        objects::{file_data_store::FileDataStore, global_id_table::GlobalIdTable},
    },
    onestore::{mapping_table::MappingTable, object::ObjectFileData},
    shared::{cell_id::CellId, compact_id::CompactId, exguid::ExGuid, file_data_ref::FileBlob},
};

type GlobalFileData = Option<Rc<FileDataStore>>;

/// Provides an interface to access shared data to mid-level parsing logic.
/// Use this, for example, to resolve IDs.
pub struct ParseContext {
    pub id_map: Rc<dyn MappingTable>,

    /// The ID of the ObjectSpace that contains the current node
    pub context_id: ExGuid,

    // TODO: Redesign to avoid using a RefCell. RefCells allow changing the value of the
    // shared pointer, but make the code more difficult to understand. Ideally, the file data
    // reference would be passed as an argument to `UnresolvedFileData.load()`, which would make
    // the dependency clear.
    file_data: Rc<RefCell<GlobalFileData>>,
}

impl ParseContext {
    pub fn new() -> Self {
        Self {
            id_map: Rc::new(ParseContextIdMapping::fallback()),
            file_data: Rc::new(RefCell::new(None)),
            context_id: exguid!({{00000000-0000-0000-0000-000000000000}, 0}),
        }
    }

    pub fn with_id_table(&self, id_table: &GlobalIdTable) -> Self {
        Self {
            id_map: Rc::new(ParseContextIdMapping::new(id_table)),
            file_data: self.file_data.clone(),
            context_id: self.context_id,
        }
    }

    pub fn with_context_id(&self, context_id: ExGuid) -> Self {
        Self {
            id_map: self.id_map.clone(),
            file_data: self.file_data.clone(),
            context_id,
        }
    }

    pub fn find_file_data(&self, data_info: &AttachmentInfo) -> Rc<dyn ObjectFileData> {
        Rc::new(UnresolvedFileData {
            file_data: self.file_data.clone(),
            file_info: data_info.clone(),
        })
    }

    // MUST be called before `UnresolvedFileData`s can resolve.
    pub fn update_file_data(&mut self, file_data: Rc<FileDataStore>) {
        self.file_data.borrow_mut().replace(file_data);
    }
}

struct UnresolvedFileData {
    file_data: Rc<RefCell<GlobalFileData>>,
    file_info: AttachmentInfo,
}

impl ObjectFileData for UnresolvedFileData {
    fn load(&self) -> Result<FileBlob> {
        let file_data = self.file_data.borrow();
        file_data
            .as_ref()
            .map(|file_data| file_data.find_file(&self.file_info))
            .unwrap_or_else(|| {
                Err(
                    parser_error!(ResolutionFailed, "file_data reference has not been loaded")
                        .into(),
                )
            })
    }
}

struct ParseContextIdMapping {
    id_table: GlobalIdTable,
}

impl ParseContextIdMapping {
    pub fn new(id_table: &GlobalIdTable) -> Self {
        Self {
            id_table: id_table.clone(),
        }
    }

    pub fn fallback() -> Self {
        Self {
            id_table: GlobalIdTable::fallback(),
        }
    }
}

impl MappingTable for ParseContextIdMapping {
    fn get_object_space(&self, _index: usize, cid: &CompactId) -> Option<CellId> {
        if let Ok(result) = self.id_table.resolve_id(cid) {
            Some(CellId(result, ExGuid::fallback()))
        } else {
            None
        }
    }

    fn resolve_id(&self, _index: usize, cid: &CompactId) -> Option<ExGuid> {
        self.id_table.resolve_id(cid).ok()
    }
}

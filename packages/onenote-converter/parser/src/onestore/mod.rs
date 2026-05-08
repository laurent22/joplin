//! A compatibility layer for unifying data stored in FSSHTTPB/SOAP files and
//! standard OneNote 2016 archives.
//!
//! Provides interfaces that are implemented by the different OneStore parsers.

use std::{io::Seek, io::SeekFrom, rc::Rc};

use crate::{
    fsshttpb_onestore::{self, packaging::OneStorePackaging},
    local_onestore::OneStoreFile,
    onestore::object_space::ObjectSpaceRef,
    shared::cell_id::CellId,
};
use parser_utils::{
    errors::{Error, ErrorKind, Result},
    parse::Parse,
    reader::Reader,
};

pub mod mapping_table;
pub mod object;
pub mod object_space;

pub trait OneStore: std::fmt::Debug {
    fn get_type(&self) -> OneStoreType;
    fn data_root(&self) -> ObjectSpaceRef;
    /// Fetches the object space that is parent to the object identified by the
    /// given `id` (if any).
    fn object_space(&self, id: CellId) -> Option<ObjectSpaceRef>;
}

#[derive(Eq, PartialEq)]
pub enum OneStoreType {
    TableOfContents, // .onetoc2
    Section,         // .one
}

pub fn parse_onestore<'a>(reader: &mut Reader<'a>) -> Result<Rc<dyn OneStore>> {
    // Try parsing as the standard format first.
    // Clone the reader to save the original offset. When retrying parsing with
    // a different format, parsing should start from the same location.
    reader.seek(SeekFrom::Start(0))?;
    let onestore_local = OneStoreFile::parse(reader);

    match onestore_local {
        Ok(onestore) => Ok(Rc::new(onestore)),
        Err(Error {
            kind: ErrorKind::NotLocalOneStore(_),
        }) => {
            reader.seek(SeekFrom::Start(0))?;
            let packaging = OneStorePackaging::parse(reader)?;
            let store = fsshttpb_onestore::parse_store(&packaging)?;
            Ok(Rc::new(store))
        }
        Err(error) => Err(error),
    }
}

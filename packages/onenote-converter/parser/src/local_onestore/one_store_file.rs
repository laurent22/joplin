use core::fmt;

use super::file_structure::{
    FileNodeListFragment, FreeChunkListFragment, OneStoreHeader, TransactionLogFragment,
};
use parser_utils::Reader;
use parser_utils::errors::Result;
use parser_utils::parse::{Parse, ParseWithCount};

use crate::local_onestore::file_structure;
use crate::local_onestore::objects;
use crate::local_onestore::objects::root_file_node_list::RootFileNodeList;
use crate::local_onestore::{common::FileChunkReference, file_structure::FileNodeList};
use crate::onestore::object_space::ObjectSpaceRef;
use crate::onestore::{OneStore, OneStoreType};
use crate::shared::cell_id::CellId;

/// A OneNote file packaged in the standard OneNote 2016 format.
///
/// See [\[MS-ONESTORE\] 2.8.1]
///
/// [\[MS-ONESTORE\] 2.8.1]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/a2f046ea-109a-49c4-912d-dc2888cf0565
///
#[allow(dead_code)]
pub struct OneStoreFile {
    pub header: OneStoreHeader,
    pub free_chunk_list: Vec<FreeChunkListFragment>,
    pub transaction_log: Vec<TransactionLogFragment>,
    pub hashed_chunk_list: Vec<FileNodeListFragment>,
    pub root_file_node_list: RootFileNodeList,
}

impl fmt::Debug for OneStoreFile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if f.alternate() {
            write!(f, "OneStoreFile({:#?})", self.root_file_node_list)
        } else {
            write!(f, "OneStoreFile({:?})", self.root_file_node_list)
        }
    }
}

impl OneStore for OneStoreFile {
    fn data_root(&self) -> ObjectSpaceRef {
        self.root_file_node_list.root_object_space.clone()
    }
    fn get_type(&self) -> OneStoreType {
        if self.header.file_type == guid!("{7B5C52E4-D88C-4DA7-AEB1-5378D02996D3}") {
            OneStoreType::Section
        } else if self.header.file_type == guid!("{43FF2FA1-EFD9-4C76-9EE2-10EA5722765F}") {
            OneStoreType::TableOfContents
        } else {
            panic!("Invalid GUID on OneStoreFile")
        }
    }
    fn object_space(&self, id: CellId) -> Option<ObjectSpaceRef> {
        // CellId doesn't seem to map perfectly to the ID representation in the OneNote 2016 format.
        // For now, use the 0th ID in CellId as the object space ID and the 1st as the entity within
        // the space's ID.
        let result = self
            .root_file_node_list
            .object_spaces
            .iter()
            .find(|space| space.id == id.0);
        if let Some(result) = result {
            Some(result.clone())
        } else {
            None
        }
    }
}

impl Parse for OneStoreFile {
    fn parse(reader: Reader) -> Result<Self> {
        let header = OneStoreHeader::parse(reader)?;

        let mut free_chunk_list = Vec::new();
        let mut free_chunk_ref = header.fcr_free_chunk_list.clone();
        while !free_chunk_ref.is_fcr_nil() && !free_chunk_ref.is_fcr_zero() {
            let mut reader = free_chunk_ref.resolve_to_reader(reader)?;
            let fragment = FreeChunkListFragment::parse(&mut reader, free_chunk_ref.cb.into())?;
            free_chunk_ref = fragment.fcr_next_chunk.clone();
            free_chunk_list.push(fragment);
        }

        let mut transaction_log = Vec::new();
        let mut transaction_log_ref = header.fcr_transaction_log.clone();
        loop {
            let mut reader = transaction_log_ref.resolve_to_reader(reader)?;

            let fragment =
                TransactionLogFragment::parse(&mut reader, transaction_log_ref.cb as usize)?;
            transaction_log_ref = fragment.next_fragment.clone();
            transaction_log.push(fragment);

            if transaction_log_ref.is_fcr_nil() || transaction_log_ref.is_fcr_zero() {
                break;
            }
        }

        let mut parse_context = file_structure::ParseContext::new();
        parse_context.update_from_transaction_log(&transaction_log);

        let mut hashed_chunk_list = Vec::new();
        let mut hash_chunk_ref = header.fcr_hashed_chunk_list.clone();
        while !hash_chunk_ref.is_fcr_nil() && !hash_chunk_ref.is_fcr_zero() {
            let mut reader = hash_chunk_ref.resolve_to_reader(reader)?;
            let fragment = FileNodeListFragment::parse(
                &mut reader,
                &mut parse_context,
                hash_chunk_ref.cb as usize,
            )?;
            hash_chunk_ref = fragment.next_fragment.clone();
            hashed_chunk_list.push(fragment);
        }

        let file_node_list_root = &header.fcr_file_node_list_root;
        let raw_file_node_list =
            if !file_node_list_root.is_fcr_nil() && !file_node_list_root.is_fcr_zero() {
                let mut reader = file_node_list_root.resolve_to_reader(reader)?;
                FileNodeList::parse(
                    &mut reader,
                    &mut parse_context,
                    file_node_list_root.cb as usize,
                )?
            } else {
                FileNodeList::default()
            };
        let mut parse_context = objects::parse_context::ParseContext::new();
        let root_file_node_list = {
            let mut iterator = raw_file_node_list.iter_data();
            RootFileNodeList::parse(&mut iterator, &parse_context)
        }?;

        if let Some(file_data_store) = root_file_node_list.file_data_store.clone() {
            parse_context.update_file_data(file_data_store);
        }

        Ok(Self {
            header,
            free_chunk_list,
            transaction_log,
            hashed_chunk_list,
            root_file_node_list,
        })
    }
}

#[cfg(test)]
mod test {
    use parser_utils::fs_driver;
    use parser_utils::parse::Parse;
    use parser_utils::reader::Reader;

    use super::OneStoreFile;

    #[test]
    fn should_parse_onenote_2016_file() {
        let test_data = fs_driver()
            .read_file("../test-data/onenote-2016/OneWithFileData.one")
            .unwrap();
        let mut reader = Reader::new(&test_data);
        let packaging = OneStoreFile::parse(&mut reader).unwrap();
        println!("Packaging {:#?}", packaging);
        assert!(packaging.root_file_node_list.object_spaces.len() > 0);
    }
}

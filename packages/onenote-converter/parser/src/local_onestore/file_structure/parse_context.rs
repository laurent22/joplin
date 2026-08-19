use std::collections::HashMap;

use crate::local_onestore::file_structure::{
    TransactionLogFragment, file_node_list_fragment::FileNodeListHeader,
};

#[derive(Default)]
pub struct ParseContext {
    file_node_count_mapping: HashMap<u32, usize>,
}

impl ParseContext {
    pub fn new() -> Self {
        Self {
            file_node_count_mapping: HashMap::new(),
        }
    }

    /// Returns the maximum number of nodes in the provided node list
    pub fn get_file_node_count(&self, header: &FileNodeListHeader) -> Option<usize> {
        self.file_node_count_mapping
            .get(&header.file_node_list_id)
            .cloned()
    }

    pub fn update_remaining_nodes_in_fragment(
        &mut self,
        header: &FileNodeListHeader,
        remaining: usize,
    ) {
        self.file_node_count_mapping
            .insert(header.file_node_list_id, remaining);
    }

    pub fn update_from_transaction_log(&mut self, log: &Vec<TransactionLogFragment>) {
        for fragment in log {
            // See [MS-ONESTORE 2.3.3.2](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/c00897d9-d90a-4707-b9fb-58c93e490322)
            // The transaction entries specify the number of nodes in the FileNodeListFragments.
            for entry in &fragment.size_table {
                if entry.is_sentinel() {
                    continue;
                }

                let new_count = entry.transaction_entry_switch as usize;
                if let Some(current_count) = self.file_node_count_mapping.get(&entry.src_id) {
                    if *current_count < new_count {
                        self.file_node_count_mapping.insert(entry.src_id, new_count);
                    }
                } else {
                    self.file_node_count_mapping.insert(entry.src_id, new_count);
                }
            }
        }
    }
}

//! A OneStore parsing implementation for the OneNote 2016 format.
//! Parses `.one` files and has partial support for `.onetoc2` files.

mod common;
mod file_node;
mod file_structure;
mod objects;
mod one_store_file;

pub use one_store_file::OneStoreFile;

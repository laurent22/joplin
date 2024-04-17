use crate::parser::errors::Result;
use itertools::Itertools;
use std::collections::HashMap;
use std::fmt;
use std::fmt::Display;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;
use widestring::U16CString;

pub(crate) fn px(inches: f32) -> String {
    format!("{}px", (inches * 48.0).round())
}

pub(crate) struct AttributeSet(HashMap<&'static str, String>);

impl AttributeSet {
    pub(crate) fn new() -> Self {
        Self(HashMap::new())
    }

    pub(crate) fn set(&mut self, attribute: &'static str, value: String) {
        self.0.insert(attribute, value);
    }
}

impl Display for AttributeSet {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            self.0
                .iter()
                .sorted_by(|(a, _), (b, _)| Ord::cmp(a, b))
                .map(|(attr, value)| attr.to_string() + "=\"" + &value + "\"")
                .join(" ")
        )
    }
}

#[derive(Debug, Clone)]
pub(crate) struct StyleSet(HashMap<&'static str, String>);

impl StyleSet {
    pub(crate) fn new() -> Self {
        Self(HashMap::new())
    }

    pub(crate) fn set(&mut self, prop: &'static str, value: String) {
        self.0.insert(prop, value);
    }

    pub(crate) fn extend(&mut self, other: Self) {
        self.0.extend(other.0.into_iter())
    }

    pub(crate) fn len(&self) -> usize {
        self.0.len()
    }
}

impl Display for StyleSet {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            self.0
                .iter()
                .sorted_by(|(a, _), (b, _)| Ord::cmp(a, b))
                .map(|(attr, value)| attr.to_string() + ": " + &value + ";")
                .join(" ")
        )
    }
}

#[wasm_bindgen]
extern "C" {
    #[derive(Debug)]
    pub type Buffer;

    #[derive(Debug)]
    pub type Nothing;

    #[derive(Debug)]
    pub type FileContent;
}

#[wasm_bindgen(module = "/node_functions.js")]
extern "C" {
    #[wasm_bindgen(js_name = mkdirSyncRecursive, catch)]
    pub fn make_dir(path: &str) -> std::result::Result<Nothing, JsValue>;

    #[wasm_bindgen(js_name = isDirectory, catch)]
    pub fn is_directory(path: &str) -> std::result::Result<bool, JsValue>;
}

#[wasm_bindgen(module = "fs")]
extern "C" {
    #[wasm_bindgen(js_name = writeFileSync, catch)]
    pub fn write_file(path: &str, data: &[u8]) -> std::result::Result<Buffer, JsValue>;

    #[wasm_bindgen(js_name = readFileSync, catch)]
    pub fn read_file(path: &str) -> std::result::Result<FileContent, JsValue>;

    #[wasm_bindgen(js_name = existsSync, catch)]
    pub fn exists(path: &str) -> std::result::Result<bool, JsValue>;
}

pub(crate) trait Utf16ToString {
    fn utf16_to_string(&self) -> Result<String>;
}

impl Utf16ToString for &[u8] {
    fn utf16_to_string(&self) -> Result<String> {
        let data: Vec<_> = self
            .chunks_exact(2)
            .map(|v| u16::from_le_bytes([v[0], v[1]]))
            .collect();

        let value = U16CString::from_vec_truncate(data);
        Ok(value.to_string().unwrap())
    }
}

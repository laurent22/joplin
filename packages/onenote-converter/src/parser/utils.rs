use crate::parser::errors::Result;
use itertools::Itertools;
use std::collections::HashMap;
use std::fmt;
use std::fmt::Display;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsValue;
use widestring::U16CString;

pub(crate) struct AttributeSet(HashMap<&'static str, String>);

#[allow(dead_code)]
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

#[allow(dead_code)]
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

#[wasm_bindgen(module = "/node_functions.js")]
extern "C" {
    #[wasm_bindgen(js_name = isDirectory, catch)]
    pub unsafe fn is_directory(path: &str) -> std::result::Result<bool, JsValue>;

    #[wasm_bindgen(js_name = readDir, catch)]
    unsafe fn read_dir_js(path: &str) -> std::result::Result<JsValue, JsValue>;
}

pub unsafe fn read_dir(path: &str) -> Option<Vec<String>> {
    let result_ptr = read_dir_js(path).unwrap();

    let result_str: String = match result_ptr.as_string() {
        Some(x) => x,
        _ => String::new(),
    };
    let names: Vec<String> = result_str.split('\n').map(|s| s.to_string()).collect_vec();
    Some(names)
}

#[wasm_bindgen(module = "fs")]
extern "C" {
    #[wasm_bindgen(js_name = readFileSync, catch)]
    pub unsafe fn read_file(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = existsSync, catch)]
    pub unsafe fn exists(path: &str) -> std::result::Result<bool, JsValue>;
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

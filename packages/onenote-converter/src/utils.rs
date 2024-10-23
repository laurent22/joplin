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

#[wasm_bindgen(module = "/node_functions.js")]
extern "C" {
    #[wasm_bindgen(js_name = mkdirSyncRecursive, catch)]
    pub unsafe fn make_dir(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = pathSep, catch)]
    pub unsafe fn path_sep() -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = removePrefix, catch)]
    pub unsafe fn remove_prefix(
        base_path: &str,
        prefix: &str,
    ) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = getOutputPath, catch)]
    pub unsafe fn get_output_path(
        input_dir: &str,
        output_dir: &str,
        file_path: &str,
    ) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = getParentDir, catch)]
    pub unsafe fn get_parent_dir(input_dir: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = normalizeAndWriteFile, catch)]
    pub unsafe fn write_file(path: &str, data: &[u8]) -> std::result::Result<JsValue, JsValue>;
}

#[wasm_bindgen(module = "fs")]
extern "C" {
    // #[wasm_bindgen(js_name = writeFileSync, catch)]
    // pub unsafe fn write_file(path: &str, data: &[u8]) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = readFileSync, catch)]
    pub unsafe fn read_file(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = existsSync, catch)]
    pub unsafe fn exists(path: &str) -> std::result::Result<bool, JsValue>;
}

#[wasm_bindgen(module = "path")]
extern "C" {
    #[wasm_bindgen(js_name = basename, catch)]
    pub unsafe fn get_file_name(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = extname, catch)]
    pub unsafe fn get_file_extension(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = dirname, catch)]
    pub unsafe fn get_dir_name(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = join, catch)]
    pub unsafe fn join_path(path_1: &str, path_2: &str) -> std::result::Result<JsValue, JsValue>;
}

pub mod utils {

    macro_rules! log {
        ( $( $t:tt )* ) => {
            #[cfg(debug_assertions)]
            web_sys::console::log_2(&format!("OneNoteConverter: ").into(), &format!( $( $t )* ).into());
        }
    }

    macro_rules! log_warn {
        ( $( $t:tt )* ) => {
            web_sys::console::warn_2(&format!("OneNoteConverter: ").into(), &format!( $( $t )* ).into());
        }
    }

    pub(crate) use log;
    pub(crate) use log_warn;
}

#[allow(dead_code)]
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

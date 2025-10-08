use crate::parser::errors::Result;
use itertools::Itertools;
use lazy_static::lazy_static;
use std::collections::HashMap;
use std::fmt;
use std::fmt::Display;
use std::sync::Mutex;
use widestring::U16CString;

mod file_api;
pub use file_api::fs_driver;
pub use file_api::FileApiDriver;

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

pub mod utils {
    #[cfg(target_arch = "wasm32")]
    macro_rules! log {
        ( $( $t:tt )* ) => {
            #[cfg(debug_assertions)]
            web_sys::console::log_2(&format!("OneNoteConverter: ").into(), &format!( $( $t )* ).into());
        }
    }

    #[cfg(target_arch = "wasm32")]
    macro_rules! log_warn {
        ( $( $t:tt )* ) => {
            use crate::utils::get_current_page;

            web_sys::console::warn_1(&format!("OneNoteConverter: Warning around the following page: {}", get_current_page()).into());
            web_sys::console::warn_2(&format!("OneNoteConverter: ").into(), &format!( $( $t )* ).into());
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    macro_rules! log {
        ( $( $t:tt )* ) => {
            #[cfg(debug_assertions)]
            println!( $( $t )* );
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    macro_rules! log_warn {
        ( $( $t:tt )* ) => {
            use crate::utils::get_current_page;
            println!("Warning: {}, near {}", &format!( $( $t )* ), get_current_page());
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

lazy_static! {
    static ref CURRENT_PAGE: Mutex<Option<String>> = Mutex::new(None);
}

pub fn set_current_page(page_name: String) {
    let mut current_page = CURRENT_PAGE.lock().unwrap();
    *current_page = Some(page_name.to_string());
}

pub fn get_current_page() -> String {
    let current_page = CURRENT_PAGE.lock().unwrap();
    current_page
        .clone()
        .unwrap_or_else(|| String::from("[None]"))
}

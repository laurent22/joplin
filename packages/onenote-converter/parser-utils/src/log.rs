use std::sync::Mutex;

use lazy_static::lazy_static;

#[macro_export]
#[cfg(target_arch = "wasm32")]
macro_rules! log {
	( $( $t:tt )* ) => {
		#[cfg(debug_assertions)]
		web_sys::console::log_2(&format!("OneNoteConverter: ").into(), &format!( $( $t )* ).into());
	}
}

#[macro_export]
#[cfg(target_arch = "wasm32")]
macro_rules! log_warn {
	( $( $t:tt )* ) => {
		use parser_utils::log::get_current_page;

		web_sys::console::warn_1(&format!("OneNoteConverter: Warning around the following page: {}", get_current_page()).into());
		web_sys::console::warn_2(&format!("OneNoteConverter: ").into(), &format!( $( $t )* ).into());
	}
}

#[macro_export]
#[cfg(not(target_arch = "wasm32"))]
macro_rules! log {
	( $( $t:tt )* ) => {
		#[cfg(debug_assertions)]
		println!( $( $t )* );
	}
}

#[macro_export]
#[cfg(not(target_arch = "wasm32"))]
macro_rules! log_warn {
	( $( $t:tt )* ) => {
		println!("Warning: {}, near {}", &format!( $( $t )* ), parser_utils::log::get_current_page());
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

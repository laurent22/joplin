use super::ApiResult;
use super::FileApiDriver;
use super::FileHandle;
use std::io::{BufReader, Read, Seek, SeekFrom};
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::wasm_bindgen;
use web_sys::js_sys;
use web_sys::js_sys::Uint8Array;

#[wasm_bindgen(module = "/node_functions.js")]
extern "C" {
    #[wasm_bindgen(js_name = mkdirSyncRecursive, catch)]
    fn make_dir(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = pathSep, catch)]
    fn path_sep() -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = removePrefix, catch)]
    fn remove_prefix(base_path: String, prefix: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = getOutputPath, catch)]
    fn get_output_path(
        input_dir: &str,
        output_dir: &str,
        file_path: &str,
    ) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = normalizeAndWriteFile, catch)]
    fn write_file(path: &str, data: &[u8]) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = isDirectory, catch)]
    fn is_directory(path: &str) -> std::result::Result<bool, JsValue>;

    #[wasm_bindgen(js_name = readDir, catch)]
    fn read_dir_js(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = fileReader, catch)]
    fn open_file_handle(path: &str) -> std::result::Result<JsFileHandle, JsValue>;
}

#[wasm_bindgen]
extern "C" {
    type JsFileHandle;

    #[wasm_bindgen(structural, method, catch)]
    fn read(
        this: &JsFileHandle,
        offset: usize,
        size: usize,
    ) -> std::result::Result<Uint8Array, JsValue>;

    #[wasm_bindgen(structural, method)]
    fn size(this: &JsFileHandle) -> usize;

    #[wasm_bindgen(structural, method, catch)]
    fn close(this: &JsFileHandle) -> std::result::Result<(), JsValue>;
}

#[wasm_bindgen(module = "fs")]
extern "C" {
    #[wasm_bindgen(js_name = readFileSync, catch)]
    fn read_file(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = existsSync, catch)]
    fn exists(path: &str) -> std::result::Result<bool, JsValue>;
}

#[wasm_bindgen(module = "path")]
extern "C" {
    #[wasm_bindgen(js_name = basename, catch)]
    fn get_file_name(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = extname, catch)]
    fn get_file_extension(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = dirname, catch)]
    fn get_dir_name(path: &str) -> std::result::Result<JsValue, JsValue>;

    #[wasm_bindgen(js_name = join, catch)]
    fn join_path(path_1: &str, path_2: &str) -> std::result::Result<JsValue, JsValue>;
}

fn handle_error(error: JsValue, source: &str) -> std::io::Error {
    use std::io::Error;
    use std::io::ErrorKind;

    let error = js_sys::Error::from(error);
    match error.name().to_string() {
        _ => Error::new(
            ErrorKind::Other,
            String::from(format!("Err({}): {:?}", source, error)),
        ),
    }
}

pub struct FileApiDriverImpl {}

impl FileApiDriver for FileApiDriverImpl {
    fn is_directory(&self, path: &str) -> ApiResult<bool> {
        match is_directory(path) {
            Ok(is_dir) => Ok(is_dir),
            Err(e) => Err(handle_error(e, "checking is_directory")),
        }
    }

    fn read_dir(&self, path: &str) -> ApiResult<Vec<String>> {
        let result_ptr = read_dir_js(path).unwrap();

        let result_str: String = match result_ptr.as_string() {
            Some(x) => x,
            _ => String::new(),
        };
        Ok(result_str.split('\n').map(|s| s.to_string()).collect())
    }

    fn read_file(&self, path: &str) -> ApiResult<Vec<u8>> {
        match read_file(path) {
            Ok(file) => Ok(Uint8Array::new(&file).to_vec()),
            Err(e) => Err(handle_error(e, &format!("reading file {}", path))),
        }
    }

    fn open_file(&self, path: &str) -> ApiResult<Box<dyn FileHandle>> {
        match open_file_handle(path) {
            Ok(handle) => {
                let file = BufReader::new(SeekableFileHandle { handle, offset: 0 });
                Ok(Box::new(file))
            }
            Err(e) => Err(handle_error(e, &format!("opening file {}", path))),
        }
    }

    fn write_file(&self, path: &str, data: &[u8]) -> ApiResult<()> {
        if let Err(error) = write_file(path, data) {
            Err(handle_error(error, &format!("writing file {}", path)))
        } else {
            Ok(())
        }
    }

    fn exists(&self, path: &str) -> ApiResult<bool> {
        match exists(path) {
            Ok(exists) => Ok(exists),
            Err(e) => Err(handle_error(e, &format!("checking exists {}", path))),
        }
    }

    fn make_dir(&self, path: &str) -> ApiResult<()> {
        if let Err(error) = make_dir(path) {
            Err(handle_error(error, &format!("mkdir {}", path)))
        } else {
            Ok(())
        }
    }

    fn get_file_name(&self, path: &str) -> Option<String> {
        let file_name = get_file_name(path).unwrap().as_string().unwrap();
        if file_name == "" {
            None
        } else {
            Some(file_name)
        }
    }
    fn get_file_extension(&self, path: &str) -> String {
        get_file_extension(path).unwrap().as_string().unwrap()
    }
    fn get_dir_name(&self, path: &str) -> String {
        get_dir_name(path).unwrap().as_string().unwrap()
    }
    fn join(&self, path_1: &str, path_2: &str) -> String {
        join_path(path_1, path_2).unwrap().as_string().unwrap()
    }
}

struct SeekableFileHandle {
    handle: JsFileHandle,
    offset: usize,
}

impl Read for SeekableFileHandle {
    fn read(&mut self, out: &mut [u8]) -> std::io::Result<usize> {
        let file_size = self.handle.size();
        let bytes_remaining = if self.offset < file_size {
            file_size - self.offset
        } else {
            0
        };

        let maximum_read_size = bytes_remaining.min(out.len());
        match self.handle.read(self.offset, maximum_read_size) {
            Ok(data) => {
                let data = data.to_vec();
                let size = data.len();
                self.offset += size;

                // Verify that handle.read respected the maximum length:
                if size > out.len() {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        "Invariant violation: Size read must be less than or equal to the maximum_read_size.",
                    ));
                }

                let (target_mem, padding) = out.split_at_mut(size);
                target_mem.copy_from_slice(&data);
                padding.fill(0);

                Ok(size)
            }
            Err(error) => {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Read failed: {:?}.", error),
                ));
            }
        }
    }
}

impl Seek for SeekableFileHandle {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        match pos {
            SeekFrom::Start(pos) => {
                self.offset = pos as usize;
            }
            SeekFrom::Current(offset) => {
                // Disallow seeking to a negative position
                if offset < 0 && (-offset) as usize > self.offset {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::InvalidInput,
                        "Attempted to seek before the beginning of the file.",
                    ));
                }

                self.offset = (self.offset as i64 + offset) as usize;
            }
            SeekFrom::End(offset) => {
                self.offset = self.handle.size();
                self.seek(SeekFrom::Current(offset))?;
            }
        }
        Ok(self.offset as u64)
    }
}

impl Drop for SeekableFileHandle {
    fn drop(&mut self) {
        if let Err(error) = self.handle.close() {
            // Use web_sys directly -- log_warn! can't be used from within the parser-utils package:
            let message: JsValue =
                format!("OneNote converter: Failed to close file: Error: {error:?}").into();
            web_sys::console::warn_1(&message);
        }
    }
}

impl FileHandle for BufReader<SeekableFileHandle> {}

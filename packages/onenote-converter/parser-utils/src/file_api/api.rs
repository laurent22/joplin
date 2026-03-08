use std::io::{Read, Seek};
use sanitize_filename::{ sanitize_with_options, Options as SanitizeOptions };

pub type ApiResult<T> = std::result::Result<T, std::io::Error>;
pub trait FileHandle: Read + Seek {}

pub trait FileApiDriver: Send + Sync {
    fn is_windows(&self) -> bool;
    fn is_directory(&self, path: &str) -> ApiResult<bool>;
    fn read_dir(&self, path: &str) -> ApiResult<Vec<String>>;
    fn read_file(&self, path: &str) -> ApiResult<Vec<u8>>;
    fn write_file(&self, path: &str, data: &[u8]) -> ApiResult<()>;
    fn make_dir(&self, path: &str) -> ApiResult<()>;
    fn exists(&self, path: &str) -> ApiResult<bool>;
    fn open_file(&self, path: &str) -> ApiResult<Box<dyn FileHandle>>;

    // These functions correspond to the similarly-named
    // NodeJS path functions and should behave like the NodeJS
    // functions (rather than the corresponding Rust functions).
    fn get_file_name(&self, path: &str) -> Option<String>;
    fn get_file_extension(&self, path: &str) -> String;
    fn get_dir_name(&self, path: &str) -> String;
    /// This function should behave like NodeJS's `path.join` function.
    /// As a result, unlike Rust's `Path::join`, if `path_2` starts with "/",
    /// `path_2` is still appended to `path_1`.
    fn join(&self, path_1: &str, path_2: &str) -> String;

    fn sanitize_file_name(&self, file_name: &str) -> String {
        sanitize_with_options(
            file_name.trim(),
            SanitizeOptions {
                // Override "windows". By default, sanitize_filename can
                // incorrectly detect the host OS when compiled to WASM.
                windows: self.is_windows(),

                // Otherwise, match the default sanitize_filename options:
                truncate: true,
                replacement: "",
            },
        )
    }

    /// Splits filename into (base, extension).
    fn split_file_name(&self, filename: &str) -> (String, String) {
        let ext = self.get_file_extension(filename);
        let base = filename.strip_suffix(&ext).unwrap_or(filename);
        (base.into(), ext)
    }
    /// Removes a prefix from a given full path.
    ///
    /// On Windows, this performs a case-insensitive and slash-agnostic comparison,
    /// safely extracting the remaining substring without relying on byte length
    /// mapping between original and lowercased strings. On POSIX systems, this
    /// performs an exact, case-sensitive string match.
    ///
    /// # Arguments
    ///
    /// * `full_path` - The absolute path to process.
    /// * `prefix` - The prefix to remove from the starting portion of the `full_path`.
    ///
    /// # Returns
    ///
    /// A string slice of `full_path` after the `prefix` is removed. If the `prefix`
    /// does not match the start of `full_path`, the original `full_path` is returned.
    fn remove_prefix<'a>(&self, full_path: &'a str, prefix: &str) -> &'a str {
        let is_win = self.is_windows();
        let full_norm = if is_win { full_path.replace('\\', "/") } else { full_path.to_string() };
        let pref_norm = if is_win { prefix.replace('\\', "/") } else { prefix.to_string() };

        let full_trim = full_norm.trim_end_matches('/');
        let pref_trim = pref_norm.trim_end_matches('/');

        let prefix_end = if is_win {
            let mut full_iter = full_trim.char_indices().flat_map(|(idx, ch)| {
                let end = idx + ch.len_utf8();
                ch.to_lowercase().map(move |folded| (folded, end))
            });
            let mut end = 0;

            for pref_ch in pref_trim.chars().flat_map(char::to_lowercase) {
                match full_iter.next() {
                    Some((full_ch, next_end)) if full_ch == pref_ch => end = next_end,
                    _ => return full_path,
                }
            }

            end
        } else {
            if !full_trim.starts_with(pref_trim) {
                return full_path;
            }
            pref_trim.len()
        };

        if prefix_end <= full_path.len() {
            let without_prefix = &full_path[prefix_end..];
            if without_prefix.starts_with('/') || without_prefix.starts_with('\\') {
                &without_prefix[1..]
            } else {
                without_prefix
            }
        } else {
            full_path
        }
    }
    fn get_output_path(&self, input_dir: &str, output_dir: &str, file_path: &str) -> String {
        let base_path = self.remove_prefix(file_path, input_dir);
        let rebased_output = self.join(output_dir, base_path);
        self.get_dir_name(&rebased_output)
    }

    fn get_parent_dir(&self, path: &str) -> Option<String> {
        let dir_name = self.get_dir_name(path);
        let result = self.get_file_name(&dir_name);

        result.filter(|value| !value.is_empty())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockWindowsDriver;
    impl FileApiDriver for MockWindowsDriver {
        fn is_windows(&self) -> bool { true }
        fn is_directory(&self, _path: &str) -> ApiResult<bool> { Ok(false) }
        fn read_dir(&self, _path: &str) -> ApiResult<Vec<String>> { Ok(vec![]) }
        fn read_file(&self, _path: &str) -> ApiResult<Vec<u8>> { Ok(vec![]) }
        fn write_file(&self, _path: &str, _data: &[u8]) -> ApiResult<()> { Ok(()) }
        fn make_dir(&self, _path: &str) -> ApiResult<()> { Ok(()) }
        fn exists(&self, _path: &str) -> ApiResult<bool> { Ok(false) }
        fn open_file(&self, _path: &str) -> ApiResult<Box<dyn FileHandle>> { Err(std::io::Error::new(std::io::ErrorKind::Other, "Not implemented")) }
        fn get_file_name(&self, _path: &str) -> Option<String> { None }
        fn get_file_extension(&self, _path: &str) -> String { String::new() }
        fn get_dir_name(&self, _path: &str) -> String { String::new() }
        fn join(&self, _path_1: &str, _path_2: &str) -> String { String::new() }
    }

    struct MockPosixDriver;
    impl FileApiDriver for MockPosixDriver {
        fn is_windows(&self) -> bool { false }
        fn is_directory(&self, _path: &str) -> ApiResult<bool> { Ok(false) }
        fn read_dir(&self, _path: &str) -> ApiResult<Vec<String>> { Ok(vec![]) }
        fn read_file(&self, _path: &str) -> ApiResult<Vec<u8>> { Ok(vec![]) }
        fn write_file(&self, _path: &str, _data: &[u8]) -> ApiResult<()> { Ok(()) }
        fn make_dir(&self, _path: &str) -> ApiResult<()> { Ok(()) }
        fn exists(&self, _path: &str) -> ApiResult<bool> { Ok(false) }
        fn open_file(&self, _path: &str) -> ApiResult<Box<dyn FileHandle>> { Err(std::io::Error::new(std::io::ErrorKind::Other, "Not implemented")) }
        fn get_file_name(&self, _path: &str) -> Option<String> { None }
        fn get_file_extension(&self, _path: &str) -> String { String::new() }
        fn get_dir_name(&self, _path: &str) -> String { String::new() }
        fn join(&self, _path_1: &str, _path_2: &str) -> String { String::new() }
    }

    #[test]
    fn test_remove_prefix_windows() {
        let driver = MockWindowsDriver;
        
        // Exact match
        assert_eq!(driver.remove_prefix("C:\\foo\\bar\\baz.one", "C:\\foo\\bar"), "baz.one");
        // Case-insensitive match
        assert_eq!(driver.remove_prefix("c:\\FOO\\bar\\baz.one", "C:\\foo\\BAR"), "baz.one");
        // Slashes match
        assert_eq!(driver.remove_prefix("C:/foo/bar/baz.one", "C:\\foo\\bar"), "baz.one");
        // No match
        assert_eq!(driver.remove_prefix("C:\\foo\\bar\\baz.one", "C:\\other"), "C:\\foo\\bar\\baz.one");
        // Trailing slash handled
        assert_eq!(driver.remove_prefix("C:\\foo\\bar\\baz.one", "C:\\foo\\bar\\"), "baz.one");
        
        // Test multibyte characters where lowercasing might change byte length.
        // The previous code panicked if doing `full_path[pref_norm.len()..]` because
        // `İ` could have a diff length lowercased.
        let multibyte_prefix = "C:\\föö\\bår";
        let multibyte_full = "C:\\FÖÖ\\BÅR\\baz.one";
        assert_eq!(driver.remove_prefix(multibyte_full, multibyte_prefix), "baz.one");
    }

    #[test]
    fn test_remove_prefix_posix() {
        let driver = MockPosixDriver;
        
        // Exact match
        assert_eq!(driver.remove_prefix("/foo/bar/baz.one", "/foo/bar"), "baz.one");
        // Case-sensitive - should NOT match if cases differ
        assert_eq!(driver.remove_prefix("/FOO/bar/baz.one", "/foo/bar"), "/FOO/bar/baz.one");
        // No match
        assert_eq!(driver.remove_prefix("/foo/bar/baz.one", "/other"), "/foo/bar/baz.one");
        // Trailing slash handled
        assert_eq!(driver.remove_prefix("/foo/bar/baz.one", "/foo/bar/"), "baz.one");
        
        // Unicode paths should work normally as they match exactly
        let multibyte_prefix = "/föö/bår";
        let multibyte_full = "/föö/bår/baz.one";
        assert_eq!(driver.remove_prefix(multibyte_full, multibyte_prefix), "baz.one");
    }
}

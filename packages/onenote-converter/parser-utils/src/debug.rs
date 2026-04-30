/// A struct that has a specific `fmt::Debug` serialization.
/// Useful when customizing a `struct`'s debug output.
pub struct DebugOutput<'a>(&'a str);

impl<'a> From<&'a str> for DebugOutput<'a> {
    fn from(value: &'a str) -> Self {
        Self(value)
    }
}

impl<'a> std::fmt::Debug for DebugOutput<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.0)
    }
}

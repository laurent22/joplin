use askama::Template;
use color_eyre::Result;
use color_eyre::eyre::WrapErr;

#[derive(Template)]
#[template(path = "section.html")]
struct NotebookTemplate<'a> {
    name: &'a str,
    pages: Vec<TocEntry>,
}

pub(crate) struct TocEntry {
    pub(crate) name: String,
    pub(crate) is_error: bool,
    pub(crate) relative_path: String,
    pub(crate) level: i32,
}

pub(crate) fn render(name: &str, pages: Vec<TocEntry>) -> Result<String> {
    let template = NotebookTemplate { name, pages };

    template
        .render()
        .wrap_err("Failed to render section template")
}

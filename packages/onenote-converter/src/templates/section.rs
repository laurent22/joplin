use askama::Template;
use color_eyre::eyre::WrapErr;
use color_eyre::Result;

#[derive(Template)]
#[template(path = "section.html")]
struct NotebookTemplate<'a> {
    name: &'a str,
    pages: Vec<Page<'a>>,
}

struct Page<'a> {
    name: &'a str,
    path: &'a str,
    level: i32,
}

pub(crate) fn render(name: &str, pages: Vec<(String, String, i32)>) -> Result<String> {
    let template = NotebookTemplate {
        name,
        pages: pages
            .iter()
            .map(|(name, path, level)| Page {
                name,
                path,
                level: *level,
            })
            .collect(),
    };

    template
        .render()
        .wrap_err("Failed to render section template")
}

mod filters {
    pub(crate) use crate::templates::url_encode as encode;
}

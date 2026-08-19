use askama::Template;
use color_eyre::Result;
use color_eyre::eyre::WrapErr;

#[derive(Template)]
#[template(path = "errors.html")]
struct ErrorPageTemplate<'a> {
    errors: &'a Vec<String>,
}

pub(crate) fn render(errors: &Vec<String>) -> Result<String> {
    ErrorPageTemplate { errors }
        .render()
        .wrap_err("Failed to render error list template")
}

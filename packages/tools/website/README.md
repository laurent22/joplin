# Joplin Website Builder

The website is mostly built by rendering Markdown files under `/readme` to HTML. More advanced pages such as the homepage or Plans page are created using a Mustache template.

Docusaurus is used to build the Help and News pages.

## To build the website

Run `yarn buildWebsite`, which will run all the required commands in the correct order. This will create the website in a relative directory `../joplin-website/docs`.

## To watch the website

To watch the website run `yarn watchWebsite`. If changing the Help or News pages, run `yarn start` from `packages/doc-builder`.

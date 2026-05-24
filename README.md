# brnwb.com

Personal blog site at [www.brnwb.com](https://www.brnwb.com), built with a small
Deno static site generator and deployed to GitHub Pages.

## Local development

Run the local dev server:

```bash
deno task dev
```

This builds from `content/`, `layouts/`, and `static/` into `html/`, serves on
port `8080`, and reloads the browser after rebuilds.

Content is written in Djot with YAML frontmatter. Page chrome lives in Eta
templates.

## Build

Create a production build:

```bash
deno task build
```

Output is written to `html/`.

## Content License

Unless otherwise noted, the written content published on `brnwb.com` is licensed
under
[Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/).

# v2 Refactor Sandbox

This directory is an isolated refactor copy of the current app.

Goals for v2:
- keep the current root app untouched
- preserve current behavior and Supabase compatibility
- split the single-file app into clearer HTML / CSS / JS files incrementally

Current phase:
- HTML kept intact as one page shell
- CSS extracted to `styles/app.css`
- runtime config extracted to `scripts/config.js`
- main application logic extracted to `scripts/app.js`

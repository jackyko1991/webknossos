# Migration Guide (Unreleased)
All migrations (for unreleased versions) of WEBKNOSSOS are documented in this file.
See `MIGRATIONS.released.md` for the migrations which are part of official releases.

This project adheres to [Calendar Versioning](http://calver.org/) `0Y.0M.MICRO`.
User-facing changes are documented in the [changelog](CHANGELOG.released.md).

## Unreleased
[Commits](https://github.com/scalableminds/webknossos/compare/24.10.0...HEAD)

### Postgres Evolutions:

- [121-worker-name.sql](conf/evolutions/121-worker-name.sql)
- [122-resolution-to-mag.sql](conf/evolutions/122-resolution-to-mag.sql)
- [123-more-model-categories.sql](conf/evolutions/123-more-model-categories.sql)

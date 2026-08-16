# Fix report

## Fixed
- `components/admin-list.tsx`: replaced invalid `rank.title` with `rank.label` to match `STAR_LEVELS`.
- `components/admin-list.tsx`: added optional `prefixStyle` to the local admin user item type, matching `lib/types.ts`.

## Validation
- Confirmed there are no remaining `rank.title` references in the admin list component.
- Confirmed `prefixStyle` is typed as `soft | solid | outline | glow` in the admin list item type.
- Confirmed JSON/package metadata is intact.

Full `npm run typecheck` / `npm run build` could not be executed in this isolated environment because dependencies are not present and package installation timed out. Run them after extracting the archive and installing dependencies with `npm install`.

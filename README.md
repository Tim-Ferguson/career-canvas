# Career Canvas

Career Canvas is a private, local-first resume studio built with TanStack Start and React. It helps people maintain multiple targeted resume versions, edit them through approachable forms, review content quality, switch among print-ready layouts, and keep the underlying data portable.

The product is deliberately industry-flexible. Its generic entry model supports conventional roles as well as clinical work, teaching, apprenticeships, projects, credentials, research, publications, awards, service, affiliations, languages, and custom sections.

## Product highlights

- Form-first editing with a live, semantic resume preview
- A device-local library of up to 24 targeted resume versions
- Automatic local autosave with no account, analytics, or resume-content API
- Last-chance page-hide saving, explicit storage-failure recovery, and transparent repair notices for damaged local libraries
- Latest-state library commits that protect rapid edits and asynchronous backup restores from stale-render overwrites
- Bounded per-resume undo and redo that groups typing bursts while preserving native field-level undo
- Eight field-aware starter stories: universal, leadership, healthcare, education, creative, skilled trades, student, and academic
- Persistent fictional-sample detection with Review, plain-text, and PDF export safeguards
- Five ATS-conscious layouts: modern, classic, executive, compact, and academic
- US Letter and A4 output, three spacing levels, three font treatments, and custom accent colors
- Section and entry creation, duplication, hiding, deletion, and keyboard-accessible reordering
- Readiness review for focus, contactability, evidence, scanability, and likely page length
- Review findings that open collapsed content and focus the exact field, entry, or section needing attention
- Session-only opportunity comparison that surfaces honest vocabulary gaps without exporting pasted job descriptions or claiming an ATS score
- JSON v2 import/export, automatic migration from the original v1 schema, plain-text export, and browser-native PDF output
- Validated whole-library backups that restore non-destructively and preserve newer versions as well as historical copies
- Live rendered page-count feedback for catching overflow before opening the PDF dialog
- Print-aware pagination that keeps normal entries together, lets oversized evidence flow safely, and provides a concrete PDF checklist
- Strict runtime validation, bounded content, portable IDs, duplicate-ID protection, and last-valid-document behavior in the advanced JSON editor
- Responsive studio and a cross-industry writing guide
- Screen-reader tab/tabpanel semantics, arrow-key workspace navigation, skip links, and keyboard-managed resume actions
- Branded, privacy-safe route error and 404 recovery with canonical/social metadata and a project favicon

## Develop

Requirements: Node.js 22.13 or newer and npm.

```sh
npm install
npm run dev
```

The local server prints its URL when ready. TanStack Start uses file-based routes in `src/routes` and generates `src/routeTree.gen.ts`.

## Verify

```sh
npm run check
```

This runs strict TypeScript checking, the Node test suite for the model and storage boundary, and a production TanStack/Cloudflare build. To run one stage:

```sh
npm run typecheck
npm run test
npm run build
```

The dependency lockfile is committed. `npm audit` should report zero known vulnerabilities before release.

## Architecture

- `src/lib/resume.ts` — versioned schema, validation, v1 migration, starters, analysis, text export, and immutable helpers
- `src/lib/storage.ts` — bounded, validated local resume library
- `src/lib/history.ts` — bounded, field-aware resume revision history
- `src/lib/tailoring.ts` — bounded, transparent opportunity-language comparison
- `src/lib/latestState.ts` — synchronous latest-state commits for race-resistant local mutations
- `src/components/Studio.tsx` — application state, autosave, document management, tabs, preview, and export flow
- `src/components/ContentEditor.tsx` — profile, section, entry, bullet, keyword, link, and ordering forms
- `src/components/ResumePreview.tsx` — one semantic document tree shared by every visual layout
- `src/styles/app.css` — studio UI, resume layouts, responsive behavior, and print rules
- `src/routes/guide.tsx` — practical cross-industry resume guidance
- `docs/schema-v2.md` — portable document contract and migration notes

## Privacy and persistence

Resume content is stored only in the browser's local storage unless the user explicitly downloads, copies, imports, or prints it. There is no login and no server-side resume database. Clearing site storage removes the device-local library, so JSON downloads are the durable backup path.

The app does not load remote fonts or runtime media. The generated social card is a static project asset and contains no user data.

## PDF and ATS boundary

PDF export uses the browser print dialog so content remains selectable text and does not pass through a cloud rendering service. All layouts render the same heading/list/link structure in the same reading order. Visual styling can improve presentation, but no template can guarantee applicant-tracking-system behavior or replace tailoring and human proofreading.

## Data compatibility

Schema v2 accepts in-progress drafts while strictly enforcing structure and safety limits. Content readiness is reported separately so users can save incomplete work without weakening import validation.

Original schema v1 files migrate on import. Migration preserves profile content, section order, headings, organization names, periods, locations, and highlights, while translating the original `classic`, `editorial`, and `compact` layouts to their closest v2 equivalents.

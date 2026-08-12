# Résumé Studio

A strict-TypeScript, local-first résumé builder with selectable layouts, reorderable sections, validated JSON editing, template persistence, JSON import/copy/download, and browser-native PDF export.

## Develop

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:4173`. The committed `dist/` output also works from any static server after `npm run build`.

## What works

- Strictly typed resume schema and runtime validation that refuses unknown fields, non-portable IDs, blank highlights, and documents over 2 MB of UTF-8 JSON.
- Live JSON editor with bounded imports, unique section/entry IDs, and errors that never destroy the last valid document. Layout, ordering, and export controls pause while JSON is invalid so they cannot overwrite an in-progress repair; import and reset remain available for recovery.
- Classic, editorial, and compact layouts.
- Drag-and-drop section ordering plus keyboard-friendly move buttons.
- One device-local saved template, restored automatically on the next visit when it still passes the current schema.
- Import, copy, and download portable JSON.
- Print stylesheet and **Save as PDF** through the browser print dialog.
- Responsive editor/preview, no account, analytics, or runtime network service.

## Verify

```sh
make check
```

This performs a strict TypeScript build, Node tests against the compiled schema/order/byte-limit logic, static privacy/accessibility/print checks, and a clean diff check.

## Boundary

PDF output uses the browser’s built-in print-to-PDF path so the document remains local and does not depend on a cloud renderer. Dragging changes section order, not arbitrary pixel positioning; a freeform page-layout engine would be a larger second product.

Braindump source run: `2026-08-11-2011-06`.

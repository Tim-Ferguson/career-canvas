# Résumé Studio

A strict-TypeScript, local-first résumé builder with selectable layouts, reorderable sections, validated JSON editing, template persistence, JSON import/copy/download, and browser-native PDF export.

## Develop

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:4173`. The committed `dist/` output also works from any static server after `npm run build`.

## What works

- Strictly typed resume schema and runtime validation.
- Live JSON editor with line/column errors that never destroys the last valid document.
- Classic, editorial, and compact layouts.
- Drag-and-drop section ordering plus keyboard-friendly move buttons.
- Device-local named template save/restore.
- Import, copy, and download portable JSON.
- Print stylesheet and **Save as PDF** through the browser print dialog.
- Responsive editor/preview, no account, analytics, or runtime network service.

## Verify

```sh
make check
```

This performs a strict TypeScript build, Node tests against the compiled schema/order logic, static privacy/accessibility checks, and a clean diff check.

## Boundary

PDF output uses the browser’s built-in print-to-PDF path so the document remains local and does not depend on a cloud renderer. Dragging changes section order, not arbitrary pixel positioning; a freeform page-layout engine would be a larger second product.

Braindump source run: `2026-08-11-2011-06`.

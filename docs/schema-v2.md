# Timo’s Resume Maker schema v2

Schema v2 separates structural validity from editorial readiness. A structurally valid document may contain empty text fields so people can safely save drafts; the Review tab identifies missing or weak content before export.

## Top-level document

```ts
interface ResumeDocument {
  schemaVersion: 2
  id: string
  title: string
  targetRole: string
  industry: string
  updatedAt: string
  profile: ResumeProfile
  settings: ResumeSettings
  sections: ResumeSection[]
}
```

Unknown properties are refused at every level. The serialized document must stay under 2 MB of UTF-8 JSON. IDs are bounded portable identifiers using letters, numbers, dots, underscores, and hyphens.

## Profile

The profile has `name`, `headline`, `email`, `phone`, `location`, `website`, `summary`, and an ordered `links` array. Links use `{ id, label, url }`, which supports LinkedIn, portfolios, GitHub, ORCID, professional profiles, and field-specific destinations without hard-coding one industry.

## Sections and entries

A section has an `id`, editable `title`, `visible` flag, `kind`, and ordered entries. Supported kinds are:

- `experience`
- `education`
- `skills`
- `projects`
- `certifications`
- `volunteering`
- `awards`
- `publications`
- `languages`
- `affiliations`
- `interests`
- `custom`

Every entry shares one portable shape:

```ts
interface ResumeEntry {
  id: string
  title: string
  organization: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  url: string
  summary: string
  highlights: string[]
  keywords: string[]
}
```

The UI changes field labels, ongoing-status language, and emphasis by section kind, but the saved data stays predictable. For example, `current: true` renders as “Present” for a role, “In progress” for education, “Active” for a credential, and “Forthcoming” for a publication. A stored end value is preserved when an entry is temporarily marked current. Less-common location and date metadata for skills, languages, and interests remains available in an optional visual-editor group rather than becoming JSON-only data. This lets the same model express roles, degrees, licenses, portfolio work, research, languages, equipment, methods, awards, service, and custom professional evidence.

## Settings

`settings` contains:

- `layout`: `modern`, `classic`, `executive`, `compact`, `minimal`, or `academic`
- `pageSize`: `letter` or `a4`
- `fontPair`: `sans`, `serif`, or `editorial`
- `density`: `comfortable`, `balanced`, or `tight`
- `accent`: a six-digit hexadecimal color

Settings affect presentation only. They never change the semantic order of profile and section content.

## Safety limits

- 2 MB maximum serialized document size
- 32 sections maximum
- 200 entries per section maximum
- 100 highlights or keywords per entry maximum
- 20,000 characters per text field maximum
- 128 characters per ID maximum
- Unique section IDs, entry IDs across all sections, and profile-link IDs

These boundaries protect local storage, rendering performance, imports, and accidental pathological documents.

## Version 1 migration

`migrateResume` accepts both schema versions. V1 fields are translated as follows:

| V1 | V2 |
| --- | --- |
| `profile` | Expanded `profile` with ordered links |
| `layout: editorial` | `settings.layout: modern` |
| `layout: classic` | `settings.layout: classic` |
| `layout: compact` | `settings.layout: compact` with tight density |
| `entry.heading` | `entry.title` |
| `entry.subheading` | `entry.organization` |
| `entry.period` | `entry.endDate`, plus `current` when it contains present/current/now |
| `entry.location` | `entry.location` |
| `entry.highlights` | `entry.highlights` |

Migration creates new document metadata and fills newly introduced fields with safe empty values. The migrated result then passes through the full v2 validator.

## Importing an existing resume

The Data workspace and the new-resume dialog accept a PDF, a Word `.docx` file, Markdown or plain text as well as JSON. The file is read in the browser and converted by rules, not by a model, so the result is a first draft to check against the original.

| Source text | V2 |
| --- | --- |
| First name-like line above the first heading | `profile.name` |
| Next short line | `profile.headline` and `targetRole` |
| Email, phone, `City, ST` and web addresses near the top or under a Contact heading | `profile.email`, `phone`, `location`, `website` and `links` |
| LinkedIn, GitHub and `mailto:` link targets stored in the file | `profile.links` and `profile.email` |
| Summary, Profile, About or Objective heading | `profile.summary` |
| Any other recognized heading, such as Work Experience or Technical Skills | A section of the matching `kind`, titled with the source heading |
| Lines with a date range above a block of bullets | One entry: `title`, `organization`, `location`, `startDate`, `endDate` |
| An end date of Present, Current or Now | `current: true` with an empty `endDate` |
| Bullets under an entry | `highlights` |
| A sentence between an entry header and its bullets | `summary` |
| `Label: a, b, c` under a skills heading | An entry titled `Label` with `keywords` |

In experience entries the line that names a role becomes `title` and the other becomes `organization`, whichever order the source uses. In education entries the school becomes `organization` and the degree becomes `title`.

Text the rules do not recognize is kept, not dropped. A resume with no familiar headings lands in one custom section named `Imported content`, and the import dialog lists what was found and anything that was skipped before the library changes.

Known limits: scanned PDFs have no text to read, older `.doc`, `.rtf`, `.pages` and `.odt` files are refused with instructions to save as PDF or `.docx`, files over 10 MB are refused, and only the first 15 pages of a PDF are read. Layouts with three or more columns, and entries whose only separator is bold type, may need entries split or merged by hand.

## Whole-library backups

The Data workspace can export a separate library envelope containing every device-local resume:

```ts
interface LibraryBackup {
  format: 'career-canvas-library'
  schemaVersion: 1
  exportedAt: string
  library: {
    activeId: string
    documents: ResumeDocument[]
  }
}
```

Restore validates every document before changing local state. Identical versions are skipped. When an incoming document has the same ID but different content, both are kept and the restored document receives a new ID and a `restored copy` title. The restore is refused before making changes if the merged result would exceed the 24-resume library limit.

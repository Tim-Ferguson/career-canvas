# Career Canvas resume schema v2

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

The UI changes field labels and emphasis by section kind, but the saved data stays predictable. This lets the same model express roles, degrees, licenses, portfolio work, research, languages, equipment, methods, awards, service, and custom professional evidence.

## Settings

`settings` contains:

- `layout`: `modern`, `classic`, `executive`, `compact`, or `academic`
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

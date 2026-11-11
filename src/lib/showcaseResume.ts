import { validateResume, type ResumeDocument } from './resume'

// The site owner's real resume, shown to first-time visitors instead of a fictional starter.
// It is committed and published, so the email and phone stay redacted here; the unredacted
// copies live in the gitignored src/personal directory.
const skillGroup = (id: string, title: string, keywords: string[]) => ({ id, title, organization: '', location: '', startDate: '', endDate: '', current: false, url: '', summary: '', highlights: [], keywords })

const showcase = {
  schemaVersion: 2,
  id: 'resume-tim-showcase',
  title: 'Tim Ferguson — Backend / Full Stack',
  targetRole: 'Backend / Full Stack Engineer',
  industry: 'Software',
  updatedAt: '2026-11-11T19:24:40.811Z',
  profile: {
    name: 'Tim Ferguson',
    headline: 'AI-Native Backend & Full Stack Engineer',
    email: '[email redacted]',
    phone: '[phone redacted]',
    location: 'Arizona',
    website: '',
    summary: 'AI-native backend and full-stack engineer with 10+ years building production systems: C# and SQL Server applications at Intel, Azure backend services at Microsoft, and AWS data platforms at SiriusXM. Works with AI coding agents (Claude Code, OpenAI Codex) every day across design, implementation, review, and debugging. Builds and runs full-stack products end to end, from data model and API to UI and deployment: Benefitly, a benefits directory covering 3,200+ companies; LiveWhere, an interactive map of all 84,000 US Census tracts; and Timo’s Resume Maker.',
    links: [{ id: 'link-github', label: 'GitHub', url: 'https://github.com/Tim-Ferguson' }],
  },
  settings: { layout: 'modern', pageSize: 'letter', fontPair: 'sans', density: 'tight', accent: '#000000', showLinkUrls: true },
  sections: [
    {
      id: 'skills',
      kind: 'skills',
      title: 'Skills',
      visible: true,
      entries: [
        skillGroup('skills-backend', 'Backend & data', ['TypeScript', 'Node.js', 'Express', 'C#', 'SQL', 'REST APIs', 'MongoDB', 'SQL Server', 'Zod', 'Python', 'Postgres', 'SQLite']),
        skillGroup('skills-ai', 'AI & agents', ['Claude Code', 'OpenAI Codex', 'Agentic workflows', 'Agent skills & plugins', 'Multi-agent coordination', 'LLM APIs (Gemini)']),
        skillGroup('skills-frontend', 'Frontend', ['React', 'TanStack Start', 'Vite', 'Tailwind CSS', 'D3', 'jQuery']),
        skillGroup('skills-cloud', 'Cloud & delivery', ['AWS', 'Cloudflare Workers / R2 / D1', 'Azure', 'Kubernetes (EKS)', 'Docker', 'Terraform', 'GitLab CI', 'GitHub Actions']),
      ],
    },
    {
      id: 'experience',
      kind: 'experience',
      title: 'Experience',
      visible: true,
      entries: [
        {
          id: 'experience-siriusxm',
          title: 'Senior DevOps Engineer',
          organization: 'SiriusXM',
          location: '',
          startDate: 'March 2022',
          endDate: '',
          current: true,
          url: '',
          summary: 'Platform and backend infrastructure for the Simplecast and Pandora Ads teams',
          highlights: [
            'Evaluated and piloted AI coding tools for the team, and wrote reusable agent skills, prompts, and docs so other engineers could adopt them',
            'Led development of an agentic DevOps tool that triages issues coming from observability tools and applies fixes where available',
            'Use AI coding agents daily to write and review Terraform, Helm, CI/CD, and IAM changes, and to trace incidents across logs, IAM, networking, and Kubernetes',
            'Built the AWS ingestion path for Simplecast YouTube data (S3, SQS, EMR Serverless, Glue, ECR, IAM)',
            'Designed the cross-account data-access model (Glue, S3, KMS, least-privilege IAM) that lets analytics and forecasting services read production data from development',
            'Leading the migration of 20+ applications and data pipelines from GCP and on-prem to AWS',
            'Built GitLab CI/CD for containerized services on EKS and upgraded clusters from Kubernetes 1.16 to 1.36 without disrupting running applications; instrumented services with DataDog, CloudWatch, OpenSearch, and Sentry',
            'Cut the AWS footprint from 26 accounts to 9 with no production impact',
          ],
          keywords: [],
        },
        {
          id: 'experience-microsoft',
          title: 'Software Engineer II',
          organization: 'Microsoft',
          location: '',
          startDate: 'September 2021',
          endDate: 'March 2022',
          current: false,
          url: '',
          summary: 'Backend development on a small Azure Cloud and Infrastructure team',
          highlights: [
            'Built a self-service customer onboarding portal integrated with Azure Active Directory through Azure PowerShell, removing manual developer steps from onboarding',
            'Refactored Azure Data Factory pipelines, cutting average runtime by ~17%',
            'Built Azure DevOps pipelines that meet Microsoft Federal standards, with Component Governance security checks in CI/CD',
          ],
          keywords: [],
        },
        {
          id: 'experience-intel',
          title: 'Software Engineer',
          organization: 'Intel',
          location: '',
          startDate: 'September 2015',
          endDate: 'September 2021',
          current: false,
          url: '',
          summary: 'Data-intensive web and desktop applications for Intel supply-chain optimization, on a Scrum team',
          highlights: [
            'Automated SQL Server schema deployments with DACPACs in GitLab CI, eliminating manual database releases',
            'Owned automation of database maintenance tasks, improving reliability and reducing hands-on work for developers',
            'Moved builds from TFS to GitLab CI and led a POC containerizing development environments so new developers could start faster',
            'Broke down user stories for junior developers and owned release support and user acceptance testing',
          ],
          keywords: [],
        },
      ],
    },
    {
      id: 'projects',
      kind: 'projects',
      title: 'Projects',
      visible: true,
      entries: [
        {
          id: 'project-benefitly',
          title: 'Benefitly',
          organization: '',
          location: '',
          startDate: '2026',
          endDate: '',
          current: true,
          url: 'https://benefitly.fyi',
          summary: 'Directory that compares the benefits and leave policies of 3,200+ US companies',
          highlights: [
            'Agent-driven research pipeline: AI agents collect benefits from official company sources into staged records that are schema-validated before a single writer commits them to the database',
            'Express API on Cloudflare Workers backed by MongoDB Atlas; a daily job publishes a snapshot and a compact D1 search index, with paginated catalog requests to stay within free-tier read limits',
            'Generates profile pages, social cards, sitemap, and llms.txt from source-backed records',
          ],
          keywords: ['Node.js', 'Express', 'MongoDB', 'Cloudflare Workers', 'D1', 'React'],
        },
        {
          id: 'project-livewhere',
          title: 'LiveWhere',
          organization: '',
          location: '',
          startDate: '2026',
          endDate: '',
          current: true,
          url: 'https://livewhere.timo.gg',
          summary: 'Quiz that maps which of the 84,122 US Census tracts match where you would want to live',
          highlights: [
            'Data pipeline joining Census, FAA/BTS, NOAA, Natural Earth, and USGS datasets into per-tract attributes, with data-integrity tests in CI',
            'Filters every tract live in the browser; a ~166 KB prebuilt mobile atlas lets phones skip loading national geometry',
            'Worker share route stores generated map images in R2 and serves personalized social cards',
          ],
          keywords: ['TypeScript', 'React', 'D3', 'Cloudflare Workers', 'R2'],
        },
        {
          id: 'project-resumaker',
          title: 'Timo’s Resume Maker',
          organization: '',
          location: '',
          startDate: '2026',
          endDate: '',
          current: true,
          url: 'https://resumaker.timo.gg',
          summary: 'Local-first resume editor with a live, print-accurate preview (Also where I made this resume!)',
          highlights: [
            'Strict Zod-validated resume schema with versioned migrations and JSON Resume import/export',
            'Deploy script builds only committed code and scans the bundle for personal data before publishing to Cloudflare Workers',
          ],
          keywords: ['TypeScript', 'React', 'TanStack Start', 'Zod', 'Cloudflare Workers'],
        },
      ],
    },
    {
      id: 'education',
      kind: 'education',
      title: 'Education',
      visible: true,
      entries: [
        { id: 'education-asu', title: 'B.S. in Computer Science', organization: 'Arizona State University', location: '', startDate: '', endDate: 'Spring 2015', current: false, url: '', summary: '', highlights: [], keywords: [] },
      ],
    },
  ],
}

export function createShowcaseResume(): ResumeDocument {
  return validateResume(structuredClone(showcase))
}

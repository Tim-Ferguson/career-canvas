export const DEFAULT_RESUME = {
    schemaVersion: 1,
    layout: "editorial",
    profile: {
        name: "Alex Morgan",
        headline: "Product-minded software engineer",
        email: "alex@example.com",
        phone: "+1 555 014 2030",
        location: "Phoenix, AZ",
        website: "alexmorgan.dev",
        summary: "I build clear, durable tools at the intersection of thoughtful product design and dependable engineering."
    },
    sections: [
        {
            id: "experience",
            title: "Experience",
            kind: "experience",
            entries: [
                {
                    id: "experience-1",
                    heading: "Senior Software Engineer",
                    subheading: "Northstar Studio",
                    period: "2022 — present",
                    location: "Remote",
                    highlights: [
                        "Led a cross-functional team delivering a workflow used by 40,000 people.",
                        "Reduced median task time by 31% through research-led product changes."
                    ]
                },
                {
                    id: "experience-2",
                    heading: "Software Engineer",
                    subheading: "Fieldwork Labs",
                    period: "2019 — 2022",
                    location: "Tempe, AZ",
                    highlights: ["Built accessible web products and the systems that kept them observable."]
                }
            ]
        },
        {
            id: "projects",
            title: "Selected Work",
            kind: "projects",
            entries: [
                {
                    id: "project-1",
                    heading: "Civic Atlas",
                    subheading: "Open-source mapping toolkit",
                    highlights: ["Designed the data model, contributor workflow, and offline-first web client."]
                }
            ]
        },
        {
            id: "education",
            title: "Education",
            kind: "education",
            entries: [
                {
                    id: "education-1",
                    heading: "B.S. Computer Science",
                    subheading: "Arizona State University",
                    period: "2019",
                    highlights: []
                }
            ]
        },
        {
            id: "skills",
            title: "Skills",
            kind: "skills",
            entries: [
                {
                    id: "skills-1",
                    heading: "TypeScript · Product systems · Accessibility · Data visualization · Technical leadership",
                    highlights: []
                }
            ]
        }
    ]
};
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function requiredString(value, path) {
    if (typeof value !== "string" || !value.trim())
        throw new Error(`${path} must be a non-empty string`);
    return value;
}
function optionalString(value, path) {
    if (value === undefined)
        return undefined;
    if (typeof value !== "string")
        throw new Error(`${path} must be a string when present`);
    return value;
}
function validateEntry(value, path) {
    if (!isRecord(value))
        throw new Error(`${path} must be an object`);
    if (!Array.isArray(value.highlights) || !value.highlights.every((item) => typeof item === "string"))
        throw new Error(`${path}.highlights must be an array of strings`);
    const entry = {
        id: requiredString(value.id, `${path}.id`),
        heading: requiredString(value.heading, `${path}.heading`),
        highlights: [...value.highlights]
    };
    const subheading = optionalString(value.subheading, `${path}.subheading`);
    const period = optionalString(value.period, `${path}.period`);
    const location = optionalString(value.location, `${path}.location`);
    if (subheading !== undefined)
        entry.subheading = subheading;
    if (period !== undefined)
        entry.period = period;
    if (location !== undefined)
        entry.location = location;
    return entry;
}
export function validateResume(value) {
    if (!isRecord(value))
        throw new Error("resume must be an object");
    if (value.schemaVersion !== 1)
        throw new Error("schemaVersion must be 1");
    if (!["classic", "editorial", "compact"].includes(value.layout))
        throw new Error("layout must be classic, editorial, or compact");
    if (!isRecord(value.profile))
        throw new Error("profile must be an object");
    const profile = {
        name: requiredString(value.profile.name, "profile.name"),
        headline: requiredString(value.profile.headline, "profile.headline"),
        email: requiredString(value.profile.email, "profile.email"),
        summary: requiredString(value.profile.summary, "profile.summary")
    };
    for (const field of ["phone", "location", "website"]) {
        const parsed = optionalString(value.profile[field], `profile.${field}`);
        if (parsed !== undefined)
            profile[field] = parsed;
    }
    if (!Array.isArray(value.sections))
        throw new Error("sections must be an array");
    const sections = value.sections.map((section, sectionIndex) => {
        if (!isRecord(section))
            throw new Error(`sections[${sectionIndex}] must be an object`);
        if (!["experience", "education", "skills", "projects", "custom"].includes(section.kind))
            throw new Error(`sections[${sectionIndex}].kind is invalid`);
        if (!Array.isArray(section.entries))
            throw new Error(`sections[${sectionIndex}].entries must be an array`);
        return {
            id: requiredString(section.id, `sections[${sectionIndex}].id`),
            title: requiredString(section.title, `sections[${sectionIndex}].title`),
            kind: section.kind,
            entries: section.entries.map((entry, entryIndex) => validateEntry(entry, `sections[${sectionIndex}].entries[${entryIndex}]`))
        };
    });
    const sectionIds = sections.map((section) => section.id);
    if (new Set(sectionIds).size !== sectionIds.length)
        throw new Error("section IDs must be unique");
    return { schemaVersion: 1, layout: value.layout, profile, sections };
}
export function moveSection(resume, sectionId, targetIndex) {
    const currentIndex = resume.sections.findIndex((section) => section.id === sectionId);
    if (currentIndex < 0)
        return resume;
    const sections = [...resume.sections];
    const [section] = sections.splice(currentIndex, 1);
    if (!section)
        return resume;
    const bounded = Math.max(0, Math.min(sections.length, targetIndex));
    sections.splice(bounded, 0, section);
    return { ...resume, sections };
}
export function cloneResume(resume) {
    return validateResume(JSON.parse(JSON.stringify(resume)));
}

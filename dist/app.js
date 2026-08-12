import { DEFAULT_RESUME, MAX_DOCUMENT_BYTES, cloneResume, moveSection, validateResume } from "./model.js";
const STORAGE_KEY = "resume-studio.template.v1";
function requiredElement(selector) {
    const node = document.querySelector(selector);
    if (!node)
        throw new Error(`Required application surface is missing: ${selector}`);
    return node;
}
const editor = requiredElement("#json-editor");
const preview = requiredElement("#resume-preview");
const errorBox = requiredElement("#json-error");
const sectionList = requiredElement("#section-list");
const status = requiredElement("#status");
let resume = loadSaved() ?? cloneResume(DEFAULT_RESUME);
let draggedSection = null;
function loadSaved() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? validateResume(JSON.parse(raw)) : null;
    }
    catch {
        return null;
    }
}
function announce(message) { status.textContent = message; }
function element(name, className) { const node = document.createElement(name); if (className)
    node.className = className; return node; }
function textLine(label, value) { if (!value)
    return null; const span = element("span"); span.textContent = `${label}${value}`; return span; }
function renderEntry(entry) {
    const article = element("article", "resume-entry");
    const heading = element("div", "entry-heading");
    const title = element("h3");
    title.textContent = entry.heading;
    const meta = element("div", "entry-meta");
    for (const line of [textLine("", entry.subheading), textLine("", entry.location), textLine("", entry.period)])
        if (line)
            meta.append(line);
    heading.append(title, meta);
    article.append(heading);
    if (entry.highlights.length) {
        const list = element("ul");
        for (const highlight of entry.highlights) {
            const item = element("li");
            item.textContent = highlight;
            list.append(item);
        }
        article.append(list);
    }
    return article;
}
function renderSection(section) {
    const container = element("section", `resume-section kind-${section.kind}`);
    const title = element("h2");
    title.textContent = section.title;
    container.append(title);
    for (const entry of section.entries)
        container.append(renderEntry(entry));
    return container;
}
function renderPreview() {
    preview.dataset.layout = resume.layout;
    const header = element("header", "resume-header");
    const name = element("h1");
    name.textContent = resume.profile.name;
    const headline = element("p", "resume-headline");
    headline.textContent = resume.profile.headline;
    const contact = element("p", "resume-contact");
    contact.textContent = [resume.profile.email, resume.profile.phone, resume.profile.location, resume.profile.website].filter(Boolean).join(" · ");
    const summary = element("p", "resume-summary");
    summary.textContent = resume.profile.summary;
    header.append(name, headline, contact, summary);
    preview.replaceChildren(header, ...resume.sections.map(renderSection));
}
function syncLayoutControl() {
    const layout = document.querySelector("#layout");
    if (layout)
        layout.value = resume.layout;
}
function updateJson() { editor.value = `${JSON.stringify(resume, null, 2)}\n`; errorBox.hidden = true; }
function renderSections() {
    sectionList.replaceChildren();
    resume.sections.forEach((section, index) => {
        const item = element("li", "section-chip");
        item.draggable = true;
        item.dataset.id = section.id;
        const grip = element("span", "grip");
        grip.textContent = "⠿";
        grip.setAttribute("aria-hidden", "true");
        const label = element("span");
        label.textContent = section.title;
        const controls = element("span", "section-controls");
        for (const [direction, symbol] of [[-1, "↑"], [1, "↓"]]) {
            const button = element("button");
            button.type = "button";
            button.textContent = symbol;
            button.disabled = direction < 0 ? index === 0 : index === resume.sections.length - 1;
            button.setAttribute("aria-label", `Move ${section.title} ${direction < 0 ? "up" : "down"}`);
            button.addEventListener("click", () => { resume = moveSection(resume, section.id, index + direction); syncAll(`Moved ${section.title}.`); });
            controls.append(button);
        }
        item.addEventListener("dragstart", () => { draggedSection = section.id; item.classList.add("dragging"); });
        item.addEventListener("dragend", () => { draggedSection = null; item.classList.remove("dragging"); });
        item.addEventListener("dragover", (event) => event.preventDefault());
        item.addEventListener("drop", (event) => { event.preventDefault(); if (!draggedSection)
            return; resume = moveSection(resume, draggedSection, index); syncAll(`Moved section to position ${index + 1}.`); });
        item.append(grip, label, controls);
        sectionList.append(item);
    });
}
function syncAll(message) { updateJson(); renderPreview(); renderSections(); syncLayoutControl(); if (message)
    announce(message); }
editor.addEventListener("input", () => {
    try {
        if (editor.value.length > MAX_DOCUMENT_BYTES)
            throw new Error("Resume JSON is larger than the 2 MB limit");
        resume = validateResume(JSON.parse(editor.value));
        errorBox.hidden = true;
        renderPreview();
        renderSections();
        syncLayoutControl();
        announce("Preview updated from JSON.");
    }
    catch (error) {
        errorBox.hidden = false;
        errorBox.textContent = error instanceof Error ? error.message : "JSON is invalid";
    }
});
document.querySelector("#layout")?.addEventListener("change", (event) => { resume = { ...resume, layout: event.currentTarget.value }; syncAll("Layout changed."); });
document.querySelector("#save")?.addEventListener("click", () => { try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
    announce("Template saved on this device.");
}
catch {
    announce("This browser refused local template storage.");
} });
document.querySelector("#reset")?.addEventListener("click", () => { if (!window.confirm("Reset the editor to the example resume?"))
    return; resume = cloneResume(DEFAULT_RESUME); syncAll("Example restored."); });
document.querySelector("#copy")?.addEventListener("click", async () => { try {
    await navigator.clipboard.writeText(JSON.stringify(resume, null, 2));
    announce("Resume JSON copied.");
}
catch {
    editor.select();
    document.execCommand("copy");
    announce("Resume JSON selected for copying.");
} });
document.querySelector("#download")?.addEventListener("click", () => { const blob = new Blob([`${JSON.stringify(resume, null, 2)}\n`], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${resume.profile.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resume"}.json`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0); });
document.querySelector("#print")?.addEventListener("click", () => window.print());
document.querySelector("#import")?.addEventListener("change", async (event) => { const input = event.currentTarget; const file = input.files?.[0]; if (!file)
    return; try {
    if (file.size > MAX_DOCUMENT_BYTES)
        throw new Error("file is larger than the 2 MB limit");
    resume = validateResume(JSON.parse(await file.text()));
    syncAll(`Imported ${file.name}.`);
}
catch (error) {
    announce(error instanceof Error ? `Import refused: ${error.message}` : "Import refused.");
}
finally {
    input.value = "";
} });
syncAll("Ready.");

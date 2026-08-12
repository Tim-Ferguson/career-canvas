import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_RESUME, cloneResume, moveSection, utf8ByteLength, validateResume } from "../dist/model.js";

test("default resume passes strict runtime validation", () => {
  assert.equal(validateResume(DEFAULT_RESUME).schemaVersion, 1);
  assert.equal(DEFAULT_RESUME.sections.length, 4);
});

test("section movement is immutable and bounded", () => {
  const source = cloneResume(DEFAULT_RESUME);
  const moved = moveSection(source, "skills", 0);
  assert.equal(moved.sections[0]?.id, "skills");
  assert.equal(source.sections.at(-1)?.id, "skills");
  assert.notEqual(moved.sections, source.sections);
});

test("duplicate section IDs are refused", () => {
  const invalid = cloneResume(DEFAULT_RESUME);
  if (invalid.sections[1]) invalid.sections[1].id = invalid.sections[0]?.id ?? "experience";
  assert.throws(() => validateResume(invalid), /section IDs must be unique/);
});

test("missing required profile data is refused", () => {
  const invalid = JSON.parse(JSON.stringify(DEFAULT_RESUME));
  invalid.profile.name = "";
  assert.throws(() => validateResume(invalid), /profile.name/);
});

test("duplicate entry IDs are refused across sections", () => {
  const invalid = cloneResume(DEFAULT_RESUME);
  invalid.sections[1].entries[0].id = invalid.sections[0].entries[0].id;
  assert.throws(() => validateResume(invalid), /entry IDs must be unique/);
});

test("unbounded resume content is refused", () => {
  const invalid = cloneResume(DEFAULT_RESUME);
  invalid.profile.summary = "x".repeat(20_001);
  assert.throws(() => validateResume(invalid), /profile.summary is too long/);
});

test("unknown fields are refused instead of being silently discarded", () => {
  const invalid = cloneResume(DEFAULT_RESUME);
  invalid.profile.emali = "typo@example.com";
  assert.throws(() => validateResume(invalid), /profile has unsupported field: emali/);
});

test("IDs and highlights remain portable and meaningful", () => {
  const invalidId = cloneResume(DEFAULT_RESUME);
  invalidId.sections[0].id = "not portable";
  assert.throws(() => validateResume(invalidId), /portable identifier/);
  const emptyHighlight = cloneResume(DEFAULT_RESUME);
  emptyHighlight.sections[0].entries[0].highlights = ["   "];
  assert.throws(() => validateResume(emptyHighlight), /non-empty strings/);
});

test("document limits count UTF-8 bytes, not JavaScript code units", () => {
  assert.equal(utf8ByteLength("résumé"), 8);
  const oversized = cloneResume(DEFAULT_RESUME);
  oversized.sections = [{
    id: "large",
    title: "Large",
    kind: "custom",
    entries: Array.from({ length: 200 }, (_, index) => ({
      id: `entry-${index}`,
      heading: "Heading",
      highlights: Array.from({ length: 100 }, () => "x".repeat(110)),
    })),
  }];
  assert.throws(() => validateResume(oversized), /larger than the 2 MB limit/);
});

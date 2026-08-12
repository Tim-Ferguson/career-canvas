import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_RESUME, cloneResume, moveSection, validateResume } from "../dist/model.js";

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

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createSection, createStarter } from './resume'
import { findDuplicateEntry, findDuplicateHighlight, findDuplicateKeyword, findDuplicateSectionTitle, normalizeReviewDuplicate } from './reviewDuplicates'

describe('exact normalized resume duplication', () => {
  it('normalizes Unicode, case, and pasted whitespace without fuzzy matching', () => {
    assert.equal(normalizeReviewDuplicate('  CAFE\u0301\n  Strategy  '), 'café strategy')
    assert.notEqual(normalizeReviewDuplicate('Strategy'), normalizeReviewDuplicate('Strategic'))
  })

  it('finds the second visible section title and ignores hidden duplicates', () => {
    const resume = createStarter()
    const duplicate = createSection('custom')
    duplicate.title = `  ${resume.sections[0]!.title.toUpperCase()}  `
    duplicate.visible = false
    resume.sections.push(duplicate)
    assert.equal(findDuplicateSectionTitle(resume), null)
    duplicate.visible = true
    assert.equal(findDuplicateSectionTitle(resume)?.sectionId, duplicate.id)
  })

  it('finds copied substantive entries and repeated keywords within one list', () => {
    const resume = createStarter()
    const section = resume.sections[0]!
    const original = section.entries[0]!
    const copied = { ...structuredClone(original), id: 'entry-copied' }
    section.entries.push(copied)
    assert.equal(findDuplicateEntry(resume)?.entryId, copied.id)

    const skills = resume.sections.find((item) => item.kind === 'skills')!
    const secondSkillGroup = { ...structuredClone(skills.entries[0]!), id: 'skill-group-second', keywords: ['Data analysis'] }
    skills.entries[0]!.keywords = ['Data analysis', 'Facilitation']
    skills.entries.push(secondSkillGroup)
    assert.equal(findDuplicateKeyword(resume), null)

    skills.entries[0]!.keywords.push(' data   ANALYSIS ')
    assert.deepEqual(findDuplicateKeyword(resume), { sectionId: skills.id, entryId: skills.entries[0]!.id, itemIndex: 2 })
  })

  it('finds the second exact Unicode-normalized highlight without conflating distinct international text', () => {
    const resume = createStarter()
    const entries = resume.sections[0]!.entries
    entries[0]!.highlights = ['Coordinated café services for 120 residents.']
    entries[1]!.highlights = ['  coordinated CAFE\u0301   services for 120 residents.  ']
    assert.deepEqual(findDuplicateHighlight(resume), { sectionId: resume.sections[0]!.id, entryId: entries[1]!.id, itemIndex: 0 })

    entries[0]!.highlights = ['परियोजना समय पर पूरी की।']
    entries[1]!.highlights = ['गुणवत्ता समीक्षा पूरी की।']
    assert.equal(findDuplicateHighlight(resume), null)
    entries[1]!.highlights = ['परियोजना समय पर पूरी की!']
    assert.equal(findDuplicateHighlight(resume), null)

    const hidden = createSection('custom')
    hidden.visible = false
    hidden.entries[0]!.highlights = ['परियोजना समय पर पूरी की।']
    resume.sections.push(hidden)
    assert.equal(findDuplicateHighlight(resume), null)
  })
})

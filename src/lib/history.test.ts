import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { HISTORY_LIMIT, changedResumePath, createResumeHistory, recordResumeChange, redoResumeChange, undoResumeChange } from './history'
import { createStarter } from './resume'

describe('bounded resume revision history', () => {
  it('finds the specific edited field and ignores unchanged documents', () => {
    const before = createStarter()
    const after = { ...before, profile: { ...before.profile, name: 'Avery Lee' } }
    assert.equal(changedResumePath(before, after), 'profile.name')
    assert.equal(changedResumePath(before, before), null)
  })

  it('groups one typing burst but separates different fields', () => {
    const first = createStarter()
    const second = { ...first, profile: { ...first.profile, name: 'J' } }
    const third = { ...second, profile: { ...second.profile, name: 'Jo' } }
    const fourth = { ...third, profile: { ...third.profile, headline: 'Leader' } }
    let history = recordResumeChange(createResumeHistory(), first, second, 1_000)
    history = recordResumeChange(history, second, third, 1_500)
    assert.equal(history.past.length, 1)
    history = recordResumeChange(history, third, fourth, 1_600)
    assert.equal(history.past.length, 2)
  })

  it('undoes and redoes in order, then clears redo after a new branch', () => {
    const first = createStarter()
    const second = { ...first, title: 'Second' }
    const third = { ...second, targetRole: 'Third' }
    let history = recordResumeChange(createResumeHistory(), first, second, 1_000)
    history = recordResumeChange(history, second, third, 3_000)
    const undone = undoResumeChange(history, third)
    assert.equal(undone.document?.title, 'Second')
    const redone = redoResumeChange(undone.history, undone.document!)
    assert.equal(redone.document?.targetRole, 'Third')
    const branched = recordResumeChange(undone.history, undone.document!, { ...undone.document!, industry: 'New branch' }, 5_000)
    assert.equal(branched.future.length, 0)
  })

  it('bounds snapshots for unusually long editing sessions', () => {
    let current = createStarter()
    let history = createResumeHistory()
    for (let index = 0; index < HISTORY_LIMIT + 20; index += 1) {
      const next = index % 2 ? { ...current, title: `Title ${index}` } : { ...current, industry: `Industry ${index}` }
      history = recordResumeChange(history, current, next, index * 2_000)
      current = next
    }
    assert.equal(history.past.length, HISTORY_LIMIT)
  })
})

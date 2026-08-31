import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { reviewBulletOutcomes, reviewEnglishBulletStarts, textWordCount, textWordSegments } from './textMetrics'

describe('international resume text metrics', () => {
  it('segments English, decomposed accents, and unspaced scripts without throwing', () => {
    assert.equal(textWordCount('Program strategy and delivery.'), 4)
    assert.deepEqual(textWordSegments('cafe\u0301'), ['café'])
    assert.ok(textWordCount('负责跨部门项目管理并按时交付关键成果。改善流程并提升客户满意度。') > 5)
    assert.ok(textWordCount('บริหารโครงการข้ามสายงานและส่งมอบผลลัพธ์ตรงเวลา') > 3)
  })

  it('reviews credible English evidence without treating Spanish or French as weak English', () => {
    const weakEnglish = reviewEnglishBulletStarts([
      'Weekly reports using the executive dashboard.',
      'Customer updates with regional partners.',
      'Project materials across launch teams.',
    ])
    assert.equal(weakEnglish.shouldFlag, true)

    const strongEnglish = reviewEnglishBulletStarts([
      'Led programs across three regions.',
      'Coordinated delivery with clinical partners.',
      'Improved quality through weekly review.',
    ])
    assert.equal(strongEnglish.shouldFlag, false)

    const nonEnglish = reviewEnglishBulletStarts([
      'Lideré proyectos con equipos regionales.',
      'Coordiné entregas para clientes públicos.',
      'Dirigé mejoras de calidad y servicio.',
      'Piloté des projets avec des équipes régionales.',
    ])
    assert.deepEqual(nonEnglish, { evaluated: 0, weakStarts: 0, shouldFlag: false })
  })

  it('recognizes international measurements and credible qualitative outcomes', () => {
    const measurements = reviewBulletOutcomes([
      'خفض وقت الانتظار ٣٠٪.',
      'Delivered €500K in funded services.',
      'Coordinated １２ regional launches.',
      'Service level ٪ above baseline.',
    ])
    assert.equal(measurements.measurableSignals, 4)
    assert.equal(measurements.hasOutcomeEvidence, true)
    assert.equal(measurements.shouldFlag, false)

    const qualitative = reviewBulletOutcomes([
      'Improved patient safety and reduced medication errors.',
      'Expanded service access and strengthened public trust.',
      'Improved service reliability and reduced downtime.',
    ])
    assert.equal(qualitative.qualitativeSignals, 3)
    assert.equal(qualitative.shouldFlag, false)
  })

  it('flags reviewable English duties while leaving unmeasured non-English evidence alone', () => {
    const duties = reviewBulletOutcomes([
      'Managed routine assignments.',
      'Weekly reports using the team dashboard.',
    ])
    assert.equal(duties.firstReviewableIndex, 0)
    assert.equal(duties.shouldFlag, true)

    const multilingual = reviewBulletOutcomes([
      'Lideré proyectos con equipos regionales.',
      'Coordonné les services pour les partenaires publics.',
      'Managed routine assignments.',
    ])
    assert.equal(multilingual.firstReviewableIndex, 2)
    assert.equal(multilingual.evaluatedEnglish, 1)
    assert.equal(multilingual.shouldFlag, true)

    const nonEnglish = reviewBulletOutcomes([
      'Lideré proyectos con equipos regionales.',
      'Coordonné les services pour les partenaires publics.',
    ])
    assert.equal(nonEnglish.evaluatedEnglish, 0)
    assert.equal(nonEnglish.shouldFlag, false)
  })
})

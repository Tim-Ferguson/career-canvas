import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { reviewEnglishBulletStarts, textWordCount, textWordSegments } from './textMetrics'

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
})

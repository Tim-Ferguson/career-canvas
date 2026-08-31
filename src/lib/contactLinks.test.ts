import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { emailHref, externalHref, phoneHref } from './contactLinks'

describe('safe portable contact links', () => {
  it('normalizes public web destinations and rejects unsafe or deceptive targets', () => {
    assert.equal(externalHref('example.com/work'), 'https://example.com/work')
    assert.equal(externalHref('//example.com/work'), 'https://example.com/work')
    assert.equal(externalHref('HTTPS://Example.com'), 'https://example.com/')
    assert.equal(externalHref('example.com:8080/work'), 'https://example.com:8080/work')
    assert.equal(externalHref('例え.テスト'), 'https://xn--r8jz45g.xn--zckzah/')
    for (const value of ['javascript:alert(1)', 'data:text/html,hello', 'mailto:person@example.com', 'https://user:secret@example.com', 'https://example..com', 'https://-example.com', 'https://example.com\\@evil.com', 'not a website', 'localhost/path']) {
      assert.equal(externalHref(value), '', value)
    }
  })

  it('creates mail links only for complete standalone addresses', () => {
    assert.equal(emailHref('person@example.com'), 'mailto:person@example.com')
    assert.equal(emailHref('jobs+resume@example.com'), 'mailto:jobs%2Bresume@example.com')
    assert.equal(emailHref('person@例え.テスト'), 'mailto:person@xn--r8jz45g.xn--zckzah')
    for (const value of ['not-an-email', 'a@@example.com', '.person@example.com', 'person..jobs@example.com', 'person@example.com?subject=hello', 'person@localhost']) {
      assert.equal(emailHref(value), '', value)
    }
  })

  it('normalizes internationally useful phone punctuation and extensions', () => {
    assert.equal(phoneHref('+44 (0)20 7946 0958'), 'tel:+442079460958')
    assert.equal(phoneHref('(602) 555-0199 ext. 42'), 'tel:6025550199;ext=42')
    for (const value of ['911', '++1 602 555 0199', '1-800-FLOWERS', '+1234567890123456']) assert.equal(phoneHref(value), '', value)
  })
})

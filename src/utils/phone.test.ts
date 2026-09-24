import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatPhone,
  formatPhoneInput,
  isSupportedPhone,
  normalizePhone,
} from './phone'

describe('phone utilities', () => {
  it('normalizes a Russian number with formatting', () => {
    assert.equal(normalizePhone('+7 (999) 123-45-67'), '79991234567')
  })

  it('replaces a leading 8 with country code 7', () => {
    assert.equal(normalizePhone('8 999 123 45 67'), '79991234567')
  })

  it('accepts supported Russian and Belarusian numbers', () => {
    assert.equal(isSupportedPhone('79991234567'), true)
    assert.equal(isSupportedPhone('375291234567'), true)
  })

  it('formats a Russian number for display', () => {
    assert.equal(formatPhone('79991234567'), '+7 (999) 123-45-67')
  })

  it('applies a mask while a Russian number is typed or pasted', () => {
    assert.equal(formatPhoneInput('999'), '+7 (999)')
    assert.equal(formatPhoneInput('8 999 123 45 67'), '+7 (999) 123-45-67')
  })

  it('formats a Belarusian number', () => {
    assert.equal(formatPhoneInput('375291234567'), '+375 (29) 123-45-67')
    assert.equal(formatPhone('375291234567'), '+375 (29) 123-45-67')
  })
})

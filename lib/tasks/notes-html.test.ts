import { describe, it, expect } from 'vitest'
import { notesToEditableHtml } from './notes-html'

describe('notesToEditableHtml', () => {
  it('returns an empty string for null/undefined/empty input', () => {
    expect(notesToEditableHtml(null)).toBe('')
    expect(notesToEditableHtml(undefined)).toBe('')
    expect(notesToEditableHtml('')).toBe('')
  })

  it('wraps plain text in a single paragraph', () => {
    expect(notesToEditableHtml('Blocked on design')).toBe('<p>Blocked on design</p>')
  })

  it('converts single newlines within a paragraph to <br>', () => {
    expect(notesToEditableHtml('Line one\nLine two')).toBe('<p>Line one<br>Line two</p>')
  })

  it('splits on blank lines into separate paragraphs', () => {
    expect(notesToEditableHtml('First\n\nSecond')).toBe('<p>First</p><p>Second</p>')
  })

  it('escapes HTML-significant characters in plain text', () => {
    expect(notesToEditableHtml('a < b & c > d')).toBe('<p>a &lt; b &amp; c &gt; d</p>')
  })

  it('passes through a value that already looks like HTML untouched', () => {
    const html = '<p>Already rich <img src="https://example.com/x.png"></p>'
    expect(notesToEditableHtml(html)).toBe(html)
  })
})

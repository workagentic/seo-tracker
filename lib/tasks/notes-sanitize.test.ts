import { describe, it, expect } from 'vitest'
import { sanitizeNotesHtml } from './notes-sanitize'

describe('sanitizeNotesHtml', () => {
  it('keeps allowed tags as-is', () => {
    expect(sanitizeNotesHtml('<p>Blocked on design<br>see screenshot</p>')).toBe(
      '<p>Blocked on design<br />see screenshot</p>'
    )
  })

  it('keeps an img with an allowed attribute', () => {
    expect(sanitizeNotesHtml('<p><img src="https://example.com/x.png" alt="screenshot"></p>')).toBe(
      '<p><img src="https://example.com/x.png" alt="screenshot" /></p>'
    )
  })

  it('strips a script tag entirely', () => {
    expect(sanitizeNotesHtml('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>')
  })

  it('strips disallowed tags but keeps their text content', () => {
    expect(sanitizeNotesHtml('<h1>Title</h1><p>body</p>')).toBe('Title<p>body</p>')
  })

  it('strips a javascript: image src', () => {
    expect(sanitizeNotesHtml('<img src="javascript:alert(1)">')).toBe('<img />')
  })

  it('strips an onerror attribute', () => {
    expect(sanitizeNotesHtml('<img src="https://example.com/x.png" onerror="alert(1)">')).toBe(
      '<img src="https://example.com/x.png" />'
    )
  })
})

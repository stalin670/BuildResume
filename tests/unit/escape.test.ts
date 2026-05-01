import { describe, it, expect } from 'vitest';
import { escapeLatex } from '@/lib/latex/escape';

describe('escapeLatex', () => {
  it('escapes ampersand', () => {
    expect(escapeLatex('R&D')).toBe('R\\&D');
  });
  it('escapes percent', () => {
    expect(escapeLatex('50%')).toBe('50\\%');
  });
  it('escapes dollar', () => {
    expect(escapeLatex('$100')).toBe('\\$100');
  });
  it('escapes hash', () => {
    expect(escapeLatex('#1')).toBe('\\#1');
  });
  it('escapes underscore', () => {
    expect(escapeLatex('snake_case')).toBe('snake\\_case');
  });
  it('escapes braces', () => {
    expect(escapeLatex('{x}')).toBe('\\{x\\}');
  });
  it('escapes tilde', () => {
    expect(escapeLatex('a~b')).toBe('a\\textasciitilde{}b');
  });
  it('escapes caret', () => {
    expect(escapeLatex('x^2')).toBe('x\\textasciicircum{}2');
  });
  it('escapes backslash', () => {
    expect(escapeLatex('a\\b')).toBe('a\\textbackslash{}b');
  });
  it('handles multiple specials in one string', () => {
    expect(escapeLatex('A & B_C 50% #1')).toBe('A \\& B\\_C 50\\% \\#1');
  });
  it('empty string', () => {
    expect(escapeLatex('')).toBe('');
  });
  it('plain string unchanged', () => {
    expect(escapeLatex('Hello World')).toBe('Hello World');
  });
});

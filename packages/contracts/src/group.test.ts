import { describe, expect, it } from 'vitest';
import { CreateGroupRequestSchema, GroupNameSchema } from './group.js';

describe('GroupNameSchema', () => {
  it('accepts 1 to 100 characters and preserves inner spacing and case', () => {
    expect(GroupNameSchema.parse('A')).toBe('A');
    expect(GroupNameSchema.parse('Book  Club')).toBe('Book  Club');
    expect(GroupNameSchema.parse('x'.repeat(100))).toHaveLength(100);
  });

  it('trims surrounding whitespace before checking length', () => {
    expect(GroupNameSchema.parse('  Book Club  ')).toBe('Book Club');
    expect(GroupNameSchema.parse(`  ${'x'.repeat(100)}  `)).toHaveLength(100);
  });

  it('normalizes to NFC', () => {
    expect(GroupNameSchema.parse('Café')).toBe('Café');
  });

  it('counts characters, not UTF-16 units', () => {
    expect(GroupNameSchema.safeParse('😀'.repeat(100)).success).toBe(true);
    expect(GroupNameSchema.safeParse('😀'.repeat(101)).success).toBe(false);
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['too long after trim', 'x'.repeat(101)],
    ['NUL', 'Bo\u0000ok'],
    ['inner newline', 'Bo\nok'],
    ['inner tab', 'Bo\tok'],
    ['C1 control', 'Bo\u0085ok'],
    ['right-to-left override', 'Bo‮ok'],
    ['isolate', 'Bo⁧ok'],
  ])('rejects %s', (_label, value) => {
    expect(GroupNameSchema.safeParse(value).success).toBe(false);
  });
});

describe('CreateGroupRequestSchema', () => {
  const id = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60';

  it('accepts a name and initial Member IDs, normalizing the name', () => {
    expect(CreateGroupRequestSchema.parse({ name: ' Club ', memberIds: [id] })).toEqual({
      name: 'Club',
      memberIds: [id],
    });
  });

  it('accepts no initial Members', () => {
    expect(CreateGroupRequestSchema.safeParse({ name: 'Club', memberIds: [] }).success).toBe(true);
  });

  it.each([
    ['missing name', { memberIds: [] }],
    ['missing memberIds', { name: 'Club' }],
    ['non-UUID member', { name: 'Club', memberIds: ['bob'] }],
    ['blank name', { name: ' ', memberIds: [] }],
  ])('rejects %s', (_label, value) => {
    expect(CreateGroupRequestSchema.safeParse(value).success).toBe(false);
  });
});

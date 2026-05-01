export const ScoreSchema = {
  type: 'object',
  properties: {
    overall: { type: 'integer', minimum: 0, maximum: 100 },
    dimensions: {
      type: 'object',
      properties: {
        actionVerbs: { type: 'integer' }, quantification: { type: 'integer' },
        keywordBreadth: { type: 'integer' }, bulletStrength: { type: 'integer' },
        clarity: { type: 'integer' }, length: { type: 'integer' }
      },
      required: ['actionVerbs', 'quantification', 'keywordBreadth', 'bulletStrength', 'clarity', 'length']
    },
    weaknesses: { type: 'array', items: { type: 'string' } }
  },
  required: ['overall', 'dimensions', 'weaknesses']
} as const;

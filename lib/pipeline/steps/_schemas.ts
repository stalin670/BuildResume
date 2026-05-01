export const ResumeDataSchema = {
  type: 'object',
  properties: {
    header: {
      type: 'object',
      properties: {
        name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' },
        portfolio: { type: 'string' }, github: { type: 'string' }, linkedin: { type: 'string' }
      },
      required: ['name', 'email', 'phone']
    },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' }, location: { type: 'string' },
          role: { type: 'string' }, dates: { type: 'string' },
          bullets: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: { type: 'string' }, detail: { type: 'string' } },
              required: ['title', 'detail']
            }
          }
        },
        required: ['company', 'location', 'role', 'dates', 'bullets']
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, url: { type: 'string' },
          tagline: { type: 'string' }, description: { type: 'string' }, tech: { type: 'string' }
        },
        required: ['name', 'tagline', 'description', 'tech']
      }
    },
    skills: {
      type: 'object',
      properties: {
        languages: { type: 'string' }, frameworks: { type: 'string' },
        tools: { type: 'string' }, soft: { type: 'string' }
      },
      required: ['languages', 'frameworks', 'tools', 'soft']
    },
    achievements: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, url: { type: 'string' }, detail: { type: 'string' } },
        required: ['title', 'detail']
      }
    },
    coursework: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, detail: { type: 'string' } },
        required: ['title', 'detail']
      }
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          school: { type: 'string' }, location: { type: 'string' },
          degree: { type: 'string' }, dates: { type: 'string' }
        },
        required: ['school', 'location', 'degree', 'dates']
      }
    }
  },
  required: ['header', 'experience', 'projects', 'skills', 'achievements', 'coursework', 'education']
} as const;

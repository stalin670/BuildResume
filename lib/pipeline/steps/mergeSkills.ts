import type { ResumeData, JDAnalysis, ResumeSkills } from '@/types/resume';

export type SkillBucket = 'languages' | 'frameworks' | 'tools';

export type SkillsDiff = {
  languages: string[];
  frameworks: string[];
  tools: string[];
};

const LANGUAGES = new Set([
  'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#', 'go', 'golang',
  'rust', 'ruby', 'php', 'kotlin', 'swift', 'scala', 'sql', 'bash', 'shell',
  'html', 'html5', 'css', 'css3', 'r', 'matlab', 'perl', 'objective-c', 'dart',
  'haskell', 'elixir', 'erlang', 'lua', 'groovy'
]);

const FRAMEWORKS = new Set([
  'react', 'reactjs', 'react.js', 'next', 'next.js', 'nextjs', 'vue', 'vue.js',
  'nuxt', 'angular', 'svelte', 'sveltekit', 'remix', 'express', 'expressjs',
  'nestjs', 'fastify', 'django', 'flask', 'fastapi', 'spring', 'spring boot',
  'rails', 'ruby on rails', 'laravel', '.net', 'asp.net', 'node', 'node.js',
  'nodejs', 'tailwind', 'tailwindcss', 'bootstrap', 'jquery', 'redux', 'mui',
  'material-ui', 'chakra', 'ember', 'gatsby', 'electron', 'flutter',
  'react native', 'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'scikit-learn'
]);

function bucketFor(skill: string): SkillBucket {
  const k = skill.trim().toLowerCase();
  if (LANGUAGES.has(k)) return 'languages';
  if (FRAMEWORKS.has(k)) return 'frameworks';
  return 'tools';
}

function tokensFromCsv(s: string): string[] {
  return s.split(/[,/;]/).map(t => t.trim()).filter(Boolean);
}

function appendCsv(existing: string, addition: string): string {
  if (!existing.trim()) return addition;
  return `${existing}, ${addition}`;
}

function bucketContains(bucket: string, skill: string): boolean {
  const lower = skill.trim().toLowerCase();
  return tokensFromCsv(bucket).some(t => t.toLowerCase() === lower);
}

function appearsInSource(skill: string, sourceLower: string): boolean {
  const k = skill.trim().toLowerCase();
  if (!k) return false;
  // word boundary match for short tokens, substring for multi-word
  if (/[\s.+-]/.test(k)) return sourceLower.includes(k);
  const re = new RegExp(`(?:^|[^a-z0-9+#.])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9+#.])`, 'i');
  return re.test(sourceLower);
}

export type MergeSkillsArgs = {
  resume: ResumeData;
  jd: JDAnalysis;
  sourceText: string;
};

export type MergeSkillsResult = {
  resume: ResumeData;
  added: SkillsDiff;
  skipped: string[];
};

export function mergeSkillsStep(args: MergeSkillsArgs): MergeSkillsResult {
  const sourceLower = args.sourceText.toLowerCase();
  const candidates = [...args.jd.mustHaveSkills, ...args.jd.niceToHaveSkills];
  const seen = new Set<string>();

  const skills: ResumeSkills = { ...args.resume.skills };
  const added: SkillsDiff = { languages: [], frameworks: [], tools: [] };
  const skipped: string[] = [];

  for (const raw of candidates) {
    const skill = raw.trim();
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (!appearsInSource(skill, sourceLower)) {
      skipped.push(skill);
      continue;
    }

    const bucket = bucketFor(skill);
    if (bucketContains(skills[bucket], skill)) continue;

    skills[bucket] = appendCsv(skills[bucket], skill);
    added[bucket].push(skill);
  }

  return {
    resume: { ...args.resume, skills },
    added,
    skipped
  };
}

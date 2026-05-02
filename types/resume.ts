export type ResumeHeader = {
  name: string;
  email: string;
  phone: string;
  portfolio?: string;
  github?: string;
  linkedin?: string;
};

export type ResumeBullet = { title: string; detail: string };

export type ResumeExperience = {
  company: string;
  location: string;
  role: string;
  dates: string;
  bullets: ResumeBullet[];
};

export type ResumeProject = {
  name: string;
  url?: string;
  tagline: string;
  description: string;
  tech: string;
};

export type ResumeSkills = {
  languages: string;
  frameworks: string;
  tools: string;
  soft: string;
};

export type ResumeAchievement = {
  title: string;
  url?: string;
  detail: string;
};

export type ResumeCoursework = { title: string; detail: string };

export type ResumeEducation = {
  school: string;
  location: string;
  degree: string;
  dates: string;
};

export type ResumeData = {
  header: ResumeHeader;
  experience: ResumeExperience[];
  projects: ResumeProject[];
  skills: ResumeSkills;
  achievements: ResumeAchievement[];
  coursework: ResumeCoursework[];
  education: ResumeEducation[];
};

export type JDAnalysis = {
  role: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  keywords: string[];
  tone: 'technical' | 'leadership' | 'product' | 'research';
  seniority: 'intern' | 'junior' | 'mid' | 'senior';
};

export type ScoreDimensions = {
  actionVerbs: number;
  quantification: number;
  keywordBreadth: number;
  bulletStrength: number;
  clarity: number;
  length: number;
};

export type Score = {
  overall: number;
  dimensions: ScoreDimensions;
  weaknesses: string[];
};

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'error';

export type TailorDiff = {
  addedSkills: { languages: string[]; frameworks: string[]; tools: string[] };
  skippedSkills: string[];
  rewrittenBullets: number;
  reorderedExperience: boolean;
  reorderedProjects: boolean;
};

export type PipelineEvent =
  | { type: 'step'; id: string; status: PipelineStepStatus; label: string;
      durationMs?: number; payload?: unknown }
  | { type: 'diff'; diff: TailorDiff }
  | { type: 'final'; tex: string; before?: Score; after?: Score }
  | { type: 'error'; stepId: string; message: string };

export type GenerateRequest =
  | { mode: 'tailor'; resumeText: string; jdText: string }
  | { mode: 'enhance'; resumeText: string };

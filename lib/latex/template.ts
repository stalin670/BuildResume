import { escapeLatex } from './escape';
import type {
  ResumeData, ResumeExperience, ResumeProject, ResumeAchievement,
  ResumeCoursework, ResumeEducation, ResumeHeader
} from '@/types/resume';

const PREAMBLE = String.raw`\documentclass[a4paper,20pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[pdftex]{hyperref}
\usepackage{fancyhdr}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.530in}
\addtolength{\evensidemargin}{-0.375in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.45in}
\addtolength{\textheight}{1in}

\urlstyle{rm}

\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-10pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-6pt}]

\newcommand{\resumeItem}[2]{
  \item\small{
    \textbf{#1}{: #2 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-1pt}\item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{#3} & \textit{#4} \\
    \end{tabular*}\vspace{-5pt}
}

\newcommand{\resumeSubItem}[2]{\resumeItem{#1}{#2}\vspace{-3pt}}

\renewcommand{\labelitemii}{$\circ$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=*]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

\begin{document}
`;

function renderHeader(h: ResumeHeader): string {
  const name = escapeLatex(h.name);
  const email = escapeLatex(h.email);
  const phone = escapeLatex(h.phone);
  const lines: string[] = [];
  lines.push(`\\textbf{{\\LARGE ${name}}} & Email: \\href{mailto:${email}}{${email}}\\\\`);
  if (h.portfolio) {
    lines.push(`\\href{${h.portfolio}}{Portfolio} & Mobile:~~~${phone} \\\\`);
  } else {
    lines.push(`& Mobile:~~~${phone} \\\\`);
  }
  if (h.github) {
    lines.push(`\\href{${h.github}}{Github: ${escapeLatex(h.github.replace(/^https?:\/\//, ''))}} \\\\`);
  }
  if (h.linkedin) {
    lines.push(`\\href{${h.linkedin}}{LinkedIn: ${escapeLatex(h.linkedin.replace(/^https?:\/\//, ''))}} \\\\`);
  }
  return [
    '\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}',
    ...lines,
    '\\end{tabular*}',
    ''
  ].join('\n');
}

function renderExperience(exp: ResumeExperience[]): string {
  if (!exp.length) return '';
  const out: string[] = ['\\vspace{-5pt}', '\\section{Experience}'];
  for (const e of exp) {
    out.push('\\resumeSubHeadingListStart');
    out.push(`\\resumeSubheading{${escapeLatex(e.company)}}{${escapeLatex(e.location)}}`);
    out.push(`{${escapeLatex(e.role)}}{${escapeLatex(e.dates)}}`);
    out.push('\\resumeItemListStart');
    for (const b of e.bullets) {
      out.push(`\\resumeItem{${escapeLatex(b.title)}}`);
      out.push(`  {${escapeLatex(b.detail)}}`);
    }
    out.push('\\resumeItemListEnd');
    out.push('\\resumeSubHeadingListEnd');
  }
  return out.join('\n') + '\n';
}

function renderProjects(projects: ResumeProject[]): string {
  if (!projects.length) return '';
  const out: string[] = ['\\vspace{-5pt}', '\\section{Projects}', '\\resumeSubHeadingListStart'];
  for (const p of projects) {
    const nameLatex = p.url
      ? `\\href{${p.url}}{${escapeLatex(p.name)}}`
      : escapeLatex(p.name);
    const title = `${nameLatex} - ${escapeLatex(p.tagline)}`;
    const body = `${escapeLatex(p.description)} Tech: ${escapeLatex(p.tech)}.`;
    out.push(`\\resumeSubItem{${title}}{${body}}`);
    out.push('\\vspace{4pt}');
  }
  out.push('\\resumeSubHeadingListEnd');
  return out.join('\n') + '\n';
}

function renderSkills(s: ResumeData['skills']): string {
  const out: string[] = ['\\vspace{-5pt}', '\\section{Skills Summary}', '\\resumeSubHeadingListStart'];
  out.push(`\\resumeSubItem{Languages}{${escapeLatex(s.languages)}}`);
  out.push(`\\resumeSubItem{Frameworks}{${escapeLatex(s.frameworks)}}`);
  out.push(`\\resumeSubItem{Tools}{${escapeLatex(s.tools)}}`);
  out.push(`\\resumeSubItem{Soft Skills}{${escapeLatex(s.soft)}}`);
  out.push('\\resumeSubHeadingListEnd');
  return out.join('\n') + '\n';
}

function renderAchievements(items: ResumeAchievement[]): string {
  if (!items.length) return '';
  const out: string[] = ['\\vspace{-5pt}', '\\section{Achievements}', '\\resumeSubHeadingListStart'];
  for (const a of items) {
    const title = a.url
      ? `\\href{${a.url}}{${escapeLatex(a.title)}}`
      : escapeLatex(a.title);
    out.push(`\\resumeSubItem{${title}}{${escapeLatex(a.detail)}}`);
  }
  out.push('\\resumeSubHeadingListEnd');
  return out.join('\n') + '\n';
}

function renderCoursework(items: ResumeCoursework[]): string {
  if (!items.length) return '';
  const out: string[] = ['\\vspace{-5pt}', '\\section{Coursework}',
                         '\\begin{description}[font=$\\bullet$]'];
  for (const c of items) {
    out.push(`\\resumeItem{${escapeLatex(c.title)}}`);
    out.push(`  {${escapeLatex(c.detail)}}`);
  }
  out.push('\\end{description}');
  return out.join('\n') + '\n';
}

function renderEducation(items: ResumeEducation[]): string {
  if (!items.length) return '';
  const out: string[] = ['\\section{~~Education}', '\\resumeSubHeadingListStart'];
  for (const e of items) {
    out.push('\\resumeSubheading');
    out.push(`  {${escapeLatex(e.school)}}{${escapeLatex(e.location)}}`);
    out.push(`  {${escapeLatex(e.degree)}}{${escapeLatex(e.dates)}}`);
  }
  out.push('\\resumeSubHeadingListEnd');
  return out.join('\n') + '\n';
}

export function renderResume(data: ResumeData): string {
  return [
    PREAMBLE,
    renderHeader(data.header),
    renderExperience(data.experience),
    renderProjects(data.projects),
    renderSkills(data.skills),
    renderAchievements(data.achievements),
    renderCoursework(data.coursework),
    renderEducation(data.education),
    '\\end{document}',
    ''
  ].join('\n');
}

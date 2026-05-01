export function escapeLatex(input: string): string {
  // Replace backslash first via a placeholder so the {} it emits
  // are not re-escaped by the brace-escaping step below.
  const BACKSLASH_PLACEHOLDER = '\x00BSLASH\x00';
  let out = input.replace(/\\/g, BACKSLASH_PLACEHOLDER);
  out = out.replace(/[{}]/g, (m) => `\\${m}`);
  out = out.replace(/&/g, '\\&');
  out = out.replace(/%/g, '\\%');
  out = out.replace(/\$/g, '\\$');
  out = out.replace(/#/g, '\\#');
  out = out.replace(/_/g, '\\_');
  out = out.replace(/~/g, '\\textasciitilde{}');
  out = out.replace(/\^/g, '\\textasciicircum{}');
  out = out.replace(new RegExp(BACKSLASH_PLACEHOLDER, 'g'), '\\textbackslash{}');
  return out;
}

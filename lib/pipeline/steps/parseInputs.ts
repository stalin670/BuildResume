export type ParseInputsArgs = { resumeText: string; jdText: string };
export type ParseInputsResult = { resumeText: string; jdText: string };

const NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

function clean(s: string): string {
  return s
    .replace(NON_PRINTABLE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function parseInputs(args: ParseInputsArgs): Promise<ParseInputsResult> {
  const resumeText = clean(args.resumeText);
  if (!resumeText) throw new Error('Resume text is empty');
  return { resumeText, jdText: clean(args.jdText) };
}

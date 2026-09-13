export interface ParsedCommand {
  name: string;
  args: string[];
}

export function parseCommand(text: string, prefix = "."): ParsedCommand | null {
  const input = text.trim();
  if (!input.startsWith(prefix)) return null;

  const body = input.slice(prefix.length).trim();
  if (!body) return null;

  const parts = body.split(/\s+/);
  const name = parts.shift()!.toLowerCase();

  return { name, args: parts };
}

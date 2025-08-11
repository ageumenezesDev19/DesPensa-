// No imports needed for file system

export function loadBlacklistFromString(content: string): string[] {
  if (!content) return [];
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export function saveBlacklistToString(blacklist: string[]): string {
  return blacklist.map(item => item.trim()).join('\n') + '\n';
}

export function addToBlacklist(blacklist: string[], term: string): string[] {
  if (term && !blacklist.includes(term)) {
    return [...blacklist, term];
  }
  return blacklist;
}

export function removeFromBlacklist(blacklist: string[], term: string): string[] {
  if (blacklist.includes(term)) {
    return blacklist.filter(t => t !== term);
  }
  return blacklist;
}

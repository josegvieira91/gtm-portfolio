// src/lib/site.ts
//
// D-14 (03-06 Task 3): the one place the public repo URL is spelled out.
// `repoFileUrl` turns a case's `export` frontmatter path into a GitHub link
// -- a file gets a `/blob/main/` link, a folder (trailing slash, for a
// multi-export chain like Case 8's Zaps) gets a `/tree/main/` link. No
// server path, no hostname other than GitHub, ever comes out of this file.

export const REPO_URL = 'https://github.com/josegvieira91/gtm-portfolio';

export function repoFileUrl(path: string): string {
  const kind = path.endsWith('/') ? 'tree' : 'blob';
  return `${REPO_URL}/${kind}/main/${path}`;
}

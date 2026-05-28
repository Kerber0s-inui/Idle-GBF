import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');

describe('PWA scaffold metadata', () => {
  it('declares installable PNG icons in the web manifest', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8')
    ) as {
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest.icons).toEqual([
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]);

    for (const icon of manifest.icons) {
      expect(existsSync(resolve(root, 'public', icon.src.slice(1)))).toBe(true);
    }
  });

  it('uses the product name as the document title', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');

    expect(html).toContain('<title>Idle GBF</title>');
  });
});

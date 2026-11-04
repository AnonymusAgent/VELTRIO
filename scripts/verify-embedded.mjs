import 'dotenv/config';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const base = process.env.TEST_EMBED_URL;
if (!base || !base.startsWith('https://')) throw new Error('Set TEST_EMBED_URL to the live HTTPS preview URL. Chromium blocks simulated public hosts accessing localhost.');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  const iframeUrl = new URL('/admin/login', base).href;
  await page.route('https://video-hub-preview.test/', route => route.fulfill({ contentType: 'text/html', body: `<!DOCTYPE html><html><head><title>Preview host</title></head><body style="margin:0"><iframe src="${iframeUrl}" style="width:100vw;height:100vh;border:0"></iframe></body></html>` }));
  await page.goto('https://video-hub-preview.test/');
  const frame = page.frameLocator('iframe');
  await frame.locator('input[name="password"]').fill(process.env.ADMIN_INITIAL_PASSWORD);
  await frame.getByRole('button', { name: 'Sign in to your studio', exact: true }).click();
  await frame.getByRole('heading', { name: 'Your studio, at a glance.' }).waitFor({ timeout: 30000 });
  assert.equal(await frame.getByRole('navigation', { name: 'Admin navigation' }).count(), 1);
  await frame.getByRole('button', { name: 'Sign out', exact: true }).click();
  await frame.getByRole('heading', { name: 'Welcome back.' }).waitFor();
  console.log('PASS: cross-site embedded preview sign-in and sign-out using partitioned cookies.');
} finally { await browser.close(); }

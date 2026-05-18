import { chromium } from 'playwright';

/**
 * Initializes and returns a Playwright browser instance
 * @returns {Promise<import('playwright').Browser>} Browser instance
 */
export async function initBrowser() {
  return await chromium.launch({ headless: false });
}

export default { initBrowser };
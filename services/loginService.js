import { chromium } from 'playwright';

export async function loginAutomatico(data) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://the-internet.herokuapp.com/login', { waitUntil: 'networkidle' });

    await page.locator('#username').pressSequentially(data.email, { delay: 100 });
    await page.locator('#password').pressSequentially(data.password, { delay: 100 });
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Login' }).click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'login-resultado.png', fullPage: true });

    const url = page.url();
    const exitoso = !url.includes('/login');

    return { success: exitoso, url };
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}
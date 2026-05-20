import { chromium } from 'playwright';

export async function loginAutomatico(data) {
  const browser = await chromium.launchPersistentContext(
    'C:\\Users\\JEFE\\AppData\\Local\\PlaywrightProfile',
    {
      channel: 'chrome',
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    }
  );

  const page = await browser.newPage();

  try {
    await page.goto('https://aplicaciones.axacolpatria.co/Seguridad/Autenticacion/Autenticacion?Mensaje=001&portal=ARL', { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    // Cerrar modal de sesión finalizada
    try {
      await page.waitForSelector('.btn-primary', { timeout: 5000, state: 'visible' });
      await page.mouse.move(644, 348);
      await page.waitForTimeout(300);
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.up();
      await page.waitForTimeout(2000);
    } catch (e) {
      // No había modal, continuar
    }

    await page.getByPlaceholder('USUARIO').click();
    await page.getByPlaceholder('USUARIO').pressSequentially(data.email, { delay: 100 });
    await page.waitForTimeout(500);

    await page.getByPlaceholder('PASSWORD').click();
    await page.getByPlaceholder('PASSWORD').pressSequentially(data.password, { delay: 100 });
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();

    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await page.waitForTimeout(5000);

    // Click en INGRESAR
    await page.waitForSelector('input.btn.btn-primary', { timeout: 5000 });
    await page.click('input.btn.btn-primary');
    await page.waitForTimeout(8000);

    // Ir directamente a Ingreso Individual
    await page.goto('https://portalarl.axacolpatria.co/PortalARL/EmpleadoDependiente/IngresoIndividual');
    await page.waitForTimeout(3000);

    // Seleccionar Cédula en Tipo de Documento
    await page.waitForSelector('#TipoIdentificacionSelect', { timeout: 5000 });
    await page.selectOption('#TipoIdentificacionSelect', { value: '1' });
    await page.waitForTimeout(1000);

    // Llenar número de documento
    await page.waitForSelector('#txtNumeroDocumento', { timeout: 5000 });
    await page.click('#txtNumeroDocumento');
    await page.waitForTimeout(500);
    await page.type('#txtNumeroDocumento', data.cedula, { delay: 100 });
    await page.waitForTimeout(1000);

    // Click en BUSCAR
    await page.waitForSelector('button.btn-primary.searchHistory', { timeout: 5000 });
    await page.click('button.btn-primary.searchHistory');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'login-resultado.png', fullPage: true });

    const url = page.url();
    const exitoso = !url.includes('Autenticacion');

    return { success: exitoso, url };
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

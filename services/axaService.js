import { chromium } from 'playwright';

/**
 * Service to affiliate a worker using AXA website
 * @param {Object} data - Worker data
 * @returns {Promise<Object>} Result object
 */
export async function afiliarTrabajador(data) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Ir al portal
    await page.goto('https://www.axacolpatria.co/');

    // 2. Esperar que cargue
    await page.waitForLoadState('networkidle');

    // =========================
    // 3. LOGIN (AJUSTAR)
    // =========================
    // EJEMPLO (tienes que grabarlo con codegen)
    /*
    await page.click('text=Ingresar');
    await page.fill('input[name="username"]', 'TU_USUARIO');
    await page.fill('input[name="password"]', 'TU_PASSWORD');
    await page.click('button[type="submit"]');
    */

    // =========================
    // 4. NAVEGAR A AFILIACIÓN
    // =========================
    /*
    await page.click('text=ARL');
    await page.click('text=Afiliación trabajadores');
    */

    // =========================
    // 5. LLENAR FORMULARIO (REAL BASE)
    // =========================

    const t = data.trabajador;

    // ⚠️ estos selectores los debes ajustar con codegen
    await page.fill('input[name="numeroDocumento"]', t.num_doc);
    await page.fill('input[name="primerNombre"]', t.nombre);

    // ejemplos adicionales:
    /*
    await page.fill('input[name="primerApellido"]', t.apellido);
    await page.selectOption('select[name="tipoDocumento"]', t.tipo_doc);
    await page.fill('input[name="fechaIngreso"]', t.fecha_ingreso);
    */

    // =========================
    // 6. CAPTCHA (manual)
    // =========================
    const captcha = await page.locator('iframe[title="reCAPTCHA"]').count();

    if (captcha > 0) {
      console.log('⚠️ Resuelve el CAPTCHA manualmente');
      await page.pause(); // aquí tú intervienes
    }

    // =========================
    // 7. ENVIAR
    // =========================
    await page.click('button[type="submit"]');

    // esperar resultado
    await page.waitForTimeout(5000);

    // =========================
    // 8. EVIDENCIA
    // =========================
    await page.screenshot({ path: 'resultado.png', fullPage: true });

    return { success: true };

  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}
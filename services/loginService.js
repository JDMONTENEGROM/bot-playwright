import { chromium } from 'playwright';

export async function loginAutomatico(data) {
  const {
    email, password, cedula, primerNombre, segundoNombre,
    primerApellido, segundoApellido, fechaNacimiento, genero, estadoCivil,
    departamento, ciudad, direccion, telefono, celular, correo,
    fechaIngreso, tipoSalario, salarioBasico, cargo, empresaEnMision,
    sucursal, centroTrabajo, tasaRiesgo, administradoraEPS, administradoraAFP,
    tipoAfiliado, grupoOcupacion, tipoOcupacion, modalidadTrabajo,
    tareasAltoRiesgo, jornadaCompleta
  } = data;
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

    // Cerrar modal de información
    try {
      await page.waitForSelector('#BtnAceptarModal', { timeout: 5000 });
      await page.click('#BtnAceptarModal');
      await page.waitForTimeout(1000);
    } catch (e) {
      // No había modal, continuar
    }

    // Llenar campos de texto - click primero luego escribir
    await page.waitForSelector('#txtPrimerNombre', { timeout: 10000 });

    await page.click('#txtPrimerNombre'); await page.type('#txtPrimerNombre', primerNombre, { delay: 50 });
    await page.click('#txtSegundoNombre'); await page.type('#txtSegundoNombre', segundoNombre, { delay: 50 });
    await page.click('#txtPrimerApellido'); await page.type('#txtPrimerApellido', primerApellido, { delay: 50 });
    await page.click('#txtSegundoApellido'); await page.type('#txtSegundoApellido', segundoApellido, { delay: 50 });
    await page.click('#dtpFechaNacimiento'); await page.type('#dtpFechaNacimiento', fechaNacimiento, { delay: 50 });
    await page.waitForTimeout(500);

    // Dropdowns
    const opcionesGenero = await page.evaluate(() => {
      const sel = document.querySelector('#GeneroSelect');
      return [...sel.options].map(o => ({ value: o.value, text: o.text }));
    });
    console.log('Genero opciones:', JSON.stringify(opcionesGenero));
    await page.selectOption('#GeneroSelect', { value: genero }); // "F" o "M"
    await page.selectOption('#estadoCivilSelect', { value: estadoCivil }); // "1","2","3","4","5"
    await page.selectOption('#DepartamentoSelect', { value: departamento });
    await page.waitForTimeout(2000); // esperar que carguen las ciudades
    await page.waitForFunction(() => {
      const sel = document.querySelector('#CiudadSelect');
      return sel && sel.options.length > 1;
    }, { timeout: 10000 });
    await page.selectOption('#CiudadSelect', { value: ciudad });

    // Más campos de texto
    await page.click('#txtDireccionDomicilio'); await page.type('#txtDireccionDomicilio', direccion, { delay: 50 });
    await page.click('#txtTelefono'); await page.type('#txtTelefono', telefono, { delay: 50 });
    await page.click('#txtCelular'); await page.type('#txtCelular', celular, { delay: 50 });
    await page.click('#txtEmail'); await page.type('#txtEmail', correo, { delay: 50 });
    await page.click('#dtpFechaIngreso'); await page.type('#dtpFechaIngreso', fechaIngreso, { delay: 50 });
    await page.waitForTimeout(500);

    // Más dropdowns
    await page.selectOption('#tipoSalarioSelect', { value: tipoSalario });
    await page.click('#Salaraio'); await page.type('#Salaraio', salarioBasico, { delay: 50 });
    await page.click('#txtCargo'); await page.type('#txtCargo', cargo, { delay: 50 });
    await page.selectOption('#EmpresasSelect', { value: empresaEnMision });
    await page.waitForFunction(() => {
      const sel = document.querySelector('#SucursalSelect');
      return sel && sel.options.length > 1;
    }, { timeout: 10000 });
    await page.selectOption('#SucursalSelect', { value: sucursal });
    await page.waitForFunction(() => {
      const sel = document.querySelector('#CentroTrabajoSelect');
      return sel && sel.options.length > 1;
    }, { timeout: 10000 });
    await page.selectOption('#CentroTrabajoSelect', { value: centroTrabajo });
    await page.selectOption('#EpsAfiliado', { value: administradoraEPS });
    await page.selectOption('#AfpAfiliado', { value: administradoraAFP });
    await page.selectOption('#tipoAfiliacionEmpresasSelect', { value: tipoAfiliado });
    await page.selectOption('#tipoGrupoOcupacionSelect', { value: grupoOcupacion });
    await page.selectOption('#tipoOcupacionEmpresasSelect', { value: tipoOcupacion });
    await page.selectOption('#modalidadTrabajoSelect', { value: modalidadTrabajo });
    await page.selectOption('#altoRiesgoSelect', { value: tareasAltoRiesgo });

    // Jornada laboral
    if (jornadaCompleta === 'Si') {
      await page.click('#rbJornadaIngIndivDependSi');
    } else {
      await page.click('#rbJornadaIngIndivDependNo');
    }

    await page.waitForTimeout(1000);

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

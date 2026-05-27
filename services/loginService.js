import { chromium } from 'playwright';
import { obtenerValor } from './mapas.js';

export async function loginAutomatico(data) {
  const {
    email, password, cedula, primerNombre, segundoNombre,
    primerApellido, segundoApellido, fechaNacimiento,
    direccion, telefono, celular, correo,
    fechaIngreso, salarioBasico, cargo, empresaEnMision,
    sucursal, centroTrabajo, tipoOcupacion, jornadaCompleta,

    // Estos llegan como nombres legibles → se traducen con mapas.js
    genero, estadoCivil, departamento, ciudad,
    tipoSalario, administradoraEPS, administradoraAFP,
    tipoAfiliado, grupoOcupacion, modalidadTrabajo, tareasAltoRiesgo
  } = data;

  // ── Traducir nombres legibles a values ──────────────────────────────────
  const v = {
    genero:           obtenerValor('Genero',           genero),
    estadoCivil:      obtenerValor('EstadoCivil',      estadoCivil),
    departamento:     obtenerValor('CodigoDepartamento', departamento),
    tipoSalario:      obtenerValor('TipoSalario',      tipoSalario),
    eps:              obtenerValor('EpsAfiliado',       administradoraEPS),
    afp:              obtenerValor('AfpAfiliado',       administradoraAFP),
    tipoAfiliado:     obtenerValor('TipoAfiliacion',   tipoAfiliado),
    grupoOcupacion:   obtenerValor('GrupoOcupacion',   grupoOcupacion),
    modalidadTrabajo: obtenerValor('ModalidadTrabajo', modalidadTrabajo),
    tareasAltoRiesgo: obtenerValor('TareaAltoRiesgo',  tareasAltoRiesgo),
  };
  // ciudad, sucursal, centroTrabajo y tipoOcupacion son dependientes
  // → se pasan directo como values desde el JSON
  // ────────────────────────────────────────────────────────────────────────

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
    await page.getByPlaceholder('USUARIO').pressSequentially(email, { delay: 100 });
    await page.waitForTimeout(500);

    await page.getByPlaceholder('PASSWORD').click();
    await page.getByPlaceholder('PASSWORD').pressSequentially(password, { delay: 100 });
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await page.waitForTimeout(5000);

    // Click en INGRESAR
    await page.waitForSelector('input.btn.btn-primary', { timeout: 5000 });
    await page.click('input.btn.btn-primary');
    await page.waitForTimeout(8000);

    // Ir a Ingreso Individual
    await page.goto('https://portalarl.axacolpatria.co/PortalARL/EmpleadoDependiente/IngresoIndividual');
    await page.waitForTimeout(3000);

    // Tipo de documento (siempre Cédula por ahora)
    await page.waitForSelector('#TipoIdentificacionSelect', { timeout: 5000 });
    await page.selectOption('#TipoIdentificacionSelect', { value: '1' });
    await page.waitForTimeout(1000);

    // Número de documento
    await page.waitForSelector('#txtNumeroDocumento', { timeout: 5000 });
    await page.click('#txtNumeroDocumento');
    await page.waitForTimeout(500);
    await page.type('#txtNumeroDocumento', cedula, { delay: 100 });
    await page.waitForTimeout(1000);

    // Buscar
    await page.waitForSelector('button.btn-primary.searchHistory', { timeout: 5000 });
    await page.click('button.btn-primary.searchHistory');
    await page.waitForTimeout(3000);

    // Cerrar modal de información si aparece
    try {
      await page.waitForSelector('#BtnAceptarModal', { timeout: 5000 });
      await page.click('#BtnAceptarModal');
      await page.waitForTimeout(1000);
    } catch (e) {
      // No había modal, continuar
    }

    // ── Campos de texto ──────────────────────────────────────────────────
    await page.waitForSelector('#txtPrimerNombre', { timeout: 10000 });
    await page.click('#txtPrimerNombre');    await page.type('#txtPrimerNombre',    primerNombre,    { delay: 50 });
    await page.click('#txtSegundoNombre');   await page.type('#txtSegundoNombre',   segundoNombre,   { delay: 50 });
    await page.click('#txtPrimerApellido'); await page.type('#txtPrimerApellido',  primerApellido,  { delay: 50 });
    await page.click('#txtSegundoApellido');await page.type('#txtSegundoApellido', segundoApellido, { delay: 50 });
    await page.click('#dtpFechaNacimiento');await page.type('#dtpFechaNacimiento', fechaNacimiento, { delay: 50 });
    await page.waitForTimeout(500);

    // ── Selects con traducción ───────────────────────────────────────────
    await page.selectOption('#GeneroSelect',      { value: v.genero });
    await page.selectOption('#estadoCivilSelect', { value: v.estadoCivil });
    await page.selectOption('#DepartamentoSelect',{ value: v.departamento });

    // Ciudad (dependiente de Departamento)
    await page.waitForFunction(() => {
      const sel = document.querySelector('#CiudadSelect');
      return sel && sel.options.length > 1;
    }, { timeout: 10000 });

    const ciudadValue = await page.$eval(
      '#CiudadSelect',
      (select, nombreCiudad) => {
        const opcion = Array.from(select.options).find(
          o => o.text.trim().toUpperCase() === nombreCiudad.trim().toUpperCase()
        );
        if (!opcion) {
          const disponibles = Array.from(select.options)
            .map(o => o.text.trim())
            .filter(t => t !== 'Seleccione una opción')
            .join(', ');
          throw new Error(`Ciudad "${nombreCiudad}" no encontrada. Disponibles: ${disponibles}`);
        }
        return opcion.value;
      },
      ciudad
    );
    await page.selectOption('#CiudadSelect', { value: ciudadValue });

    // ── Más campos de texto ──────────────────────────────────────────────
    await page.click('#txtDireccionDomicilio'); await page.type('#txtDireccionDomicilio', direccion,    { delay: 50 });
    await page.click('#txtTelefono');           await page.type('#txtTelefono',           telefono,     { delay: 50 });
    await page.click('#txtCelular');            await page.type('#txtCelular',            celular,      { delay: 50 });
    await page.click('#txtEmail');              await page.type('#txtEmail',              correo,       { delay: 50 });
    await page.click('#dtpFechaIngreso');       await page.type('#dtpFechaIngreso',       fechaIngreso, { delay: 50 });
    await page.waitForTimeout(500);

    // ── Más selects con traducción ───────────────────────────────────────
    await page.selectOption('#tipoSalarioSelect', { value: v.tipoSalario });
    await page.click('#Salaraio'); await page.type('#Salaraio', salarioBasico, { delay: 50 });
    await page.click('#txtCargo'); await page.type('#txtCargo', cargo,         { delay: 50 });

    await page.selectOption('#EmpresasSelect', { value: empresaEnMision });

    // Sucursal (dependiente de Empresa)
    await page.waitForFunction(() => {
      const sel = document.querySelector('#SucursalSelect');
      return sel && sel.options.length > 1;
    }, { timeout: 10000 });

    const sucursalValue = await page.$eval(
      '#SucursalSelect',
      (select, nombre) => {
        const opcion = Array.from(select.options).find(
          o => o.text.trim().toUpperCase().includes(nombre.trim().toUpperCase())
        );
        if (!opcion) {
          const disponibles = Array.from(select.options)
            .map(o => o.text.trim())
            .filter(t => t !== 'Seleccione una opción')
            .join(', ');
          throw new Error(`Sucursal "${nombre}" no encontrada. Disponibles: ${disponibles}`);
        }
        return opcion.value;
      },
      sucursal
    );
    await page.selectOption('#SucursalSelect', { value: sucursalValue });

    // Centro de Trabajo (dependiente de Sucursal)
    await page.waitForFunction(() => {
      const sel = document.querySelector('#CentroTrabajoSelect');
      return sel && sel.options.length > 1;
    }, { timeout: 10000 });

    const centroValue = await page.$eval(
      '#CentroTrabajoSelect',
      (select, nombre) => {
        const opcion = Array.from(select.options).find(
          o => o.text.trim().toUpperCase().includes(nombre.trim().toUpperCase())
        );
        if (!opcion) {
          const disponibles = Array.from(select.options)
            .map(o => o.text.trim())
            .filter(t => t !== 'Seleccione una opción')
            .join(', ');
          throw new Error(`Centro de trabajo "${nombre}" no encontrada. Disponibles: ${disponibles}`);
        }
        return opcion.value;
      },
      centroTrabajo
    );
    await page.selectOption('#CentroTrabajoSelect', { value: centroValue });

    await page.selectOption('#EpsAfiliado',                { value: v.eps });
    await page.selectOption('#AfpAfiliado',                { value: v.afp });
    await page.selectOption('#tipoAfiliacionEmpresasSelect',{ value: v.tipoAfiliado });
    await page.selectOption('#tipoGrupoOcupacionSelect',   { value: v.grupoOcupacion });
    await page.waitForTimeout(2000);
    await page.waitForFunction(() => {
      const sel = document.querySelector('#tipoOcupacionEmpresasSelect');
      return sel && sel.options.length > 1;
    }, { timeout: 15000 });
    await page.selectOption('#tipoOcupacionEmpresasSelect',{ value: tipoOcupacion });
    await page.selectOption('#modalidadTrabajoSelect',     { value: v.modalidadTrabajo });
    await page.selectOption('#altoRiesgoSelect',           { value: v.tareasAltoRiesgo });

    // Jornada laboral
    if (jornadaCompleta === 'Si') {
      await page.click('#rbJornadaIngIndivDependSi');
    } else {
      await page.click('#rbJornadaIngIndivDependNo');
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'login-resultado.png', fullPage: true });

    const url = page.url();
    return { success: !url.includes('Autenticacion'), url };

  } catch (error) {
    console.error('Error en loginAutomatico:', error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}
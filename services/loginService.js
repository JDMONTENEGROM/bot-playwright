import { chromium } from 'playwright';
import { obtenerValor } from './mapas.js';

async function llenar(page, selector, valor) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector, { clickCount: 3 });
  await page.waitForTimeout(100);
  await page.type(selector, String(valor), { delay: 50 });
}

export async function loginAutomatico(data) {
  const {
    email, password, cedula, primerNombre, segundoNombre,
    primerApellido, segundoApellido, fechaNacimiento,
    direccion, telefono, celular, correo,
    fechaIngreso, salarioBasico, cargo, empresaEnMision, empresaAxa,
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
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-autofill-keyboard-accessory-view',
        '--disable-features=AutofillServerCommunication',
        '--disable-autofill',
      ]
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

    // Seleccionar empresa en AXA
    await page.waitForSelector('#ddlEmpresas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Cambiar valor directamente en el DOM
    await page.evaluate((nombreEmpresa) => {
      const select = document.querySelector('#ddlEmpresas');
      const normalizar = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      const opcion = Array.from(select.options).find(
        o => normalizar(o.text.trim()).includes(normalizar(nombreEmpresa.trim()))
      );
      if (!opcion) throw new Error(`Empresa "${nombreEmpresa}" no encontrada`);
      select.value = opcion.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input',  { bubbles: true }));
    }, empresaAxa);

    await page.waitForTimeout(3000); // esperar que el portal procese el cambio

    // Verificar que quedó seleccionada
    const empresaSeleccionada = await page.$eval('#ddlEmpresas', s => s.options[s.selectedIndex]?.text ?? '');
    console.log('Empresa seleccionada:', empresaSeleccionada);

    // SOLO después hacer click en INGRESAR
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

    // Esperar que el portal pre-llene los campos antes de limpiarlos
    await page.waitForTimeout(3000);

    // Limpiar todos los campos de texto que el portal pre-llenó
    await page.evaluate(() => {
      document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"]')
        .forEach(el => { el.value = ''; });
    });
    await page.waitForTimeout(500);

    // ── Campos de texto ──────────────────────────────────────────────────
    await llenar(page, '#txtPrimerNombre',    primerNombre);
    await llenar(page, '#txtSegundoNombre',   segundoNombre);
    await llenar(page, '#txtPrimerApellido',  primerApellido);
    await llenar(page, '#txtSegundoApellido', segundoApellido);
    await llenar(page, '#dtpFechaNacimiento', fechaNacimiento);
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
        const normalizar = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        const opcion = Array.from(select.options).find(
          o => normalizar(o.text.trim()) === normalizar(nombreCiudad.trim())
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
    await llenar(page, '#txtDireccionDomicilio', direccion);
    await llenar(page, '#txtTelefono',           telefono);
    await llenar(page, '#txtCelular',            celular);
    await llenar(page, '#txtEmail',              correo);
    await llenar(page, '#dtpFechaIngreso',       fechaIngreso);
    await page.waitForTimeout(500);

    // ── Más selects con traducción ───────────────────────────────────────
    await page.selectOption('#tipoSalarioSelect', { value: v.tipoSalario });
    await llenar(page, '#Salaraio', salarioBasico);
    await llenar(page, '#txtCargo', cargo);

    await page.waitForSelector('#EmpresasSelect', { timeout: 10000 });
    await page.selectOption('#EmpresasSelect', { value: empresaEnMision });

    // Sucursal (dependiente de Empresa)
    await page.waitForFunction(() => {
      const sel = document.querySelector('#SucursalSelect');
      return sel && sel.options.length > 1;
    }, { timeout: 10000 });

    const sucursalValue = await page.$eval(
      '#SucursalSelect',
      (select, nombre) => {
        const normalizar = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        const opcion = Array.from(select.options).find(
          o => normalizar(o.text.trim()).includes(normalizar(nombre.trim()))
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
        const normalizar = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
        const opcion = Array.from(select.options).find(
          o => normalizar(o.text.trim()).includes(normalizar(nombre.trim()))
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
    const tipoOcupacionValue = await page.$eval(
      '#tipoOcupacionEmpresasSelect',
      (select, nombre) => {
        const normalizar = s => {
          let r = '';
          for (let i = 0; i < s.length; i++) {
            const c = s.charCodeAt(i);
            if (c < 128) r += s[i].toLowerCase();
          }
          return r.trim();
        };

        const nombreNorm = normalizar(nombre);
        const opcion = Array.from(select.options).find(
          o => normalizar(o.text).includes(nombreNorm) || nombreNorm.includes(normalizar(o.text))
        );
        if (!opcion) {
          const disponibles = Array.from(select.options)
            .map(o => o.text.trim())
            .filter(t => t && t !== 'Seleccione una opción')
            .join(' | ');
          throw new Error(`Tipo ocupación "${nombre}" no encontrada. Disponibles: ${disponibles}`);
        }
        return opcion.value;
      },
      tipoOcupacion
    );
    await page.selectOption('#tipoOcupacionEmpresasSelect', { value: tipoOcupacionValue });
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

     //Hacer clic en Ingresar Empleado
     await page.waitForSelector('input#btnModificar', { timeout: 15000 });
     console.log('✅ Haciendo clic en Ingresar Empleado...');
     await page.click('input#btnModificar');
     await page.waitForTimeout(3000);

    // Esperar modal "Transacción Exitosa"
    await page.waitForSelector('#BtnAceptarModal', { timeout: 30000 });
    console.log('✅ Transacción exitosa, cerrando modal...');
    await page.click('#BtnAceptarModal');
    await page.waitForTimeout(2000);

    // Clic en Imprimir Comprobante
    await page.waitForSelector('input#btnImprimir', { timeout: 15000 });
    console.log('✅ Haciendo clic en Imprimir Comprobante...');

    // Capturar la nueva pestaña que abre el PDF
    const [nuevaPestana] = await Promise.all([
      page.context().waitForEvent('page'),
      page.click('input#btnImprimir')
    ]);

    await nuevaPestana.waitForLoadState('networkidle');
    const urlPdf = nuevaPestana.url();
    console.log('✅ URL del comprobante:', urlPdf);

    // Descargar el PDF con la sesión activa
    let comprobantePdf = null;
    let tipoArchivo = 'pdf';
    try {
      const pdfBuffer = await nuevaPestana.pdf({ 
        format: 'A4',
        printBackground: true 
      });
      comprobantePdf = Buffer.from(pdfBuffer).toString('base64');
      console.log('✅ PDF capturado como base64');
    } catch(e) {
      console.log('⚠️ pdf() falló, capturando screenshot:', e.message);
      const screenshot = await nuevaPestana.screenshot({ fullPage: true });
      comprobantePdf = Buffer.from(screenshot).toString('base64');
      tipoArchivo = 'png';
    }

    return { 
      success: true, 
      mensaje: 'Empleado registrado correctamente en AXA',
      urlComprobante: urlPdf,
      comprobantePdf: comprobantePdf,
      tipoArchivo: tipoArchivo
    };

  } catch (error) {
    console.error('Error en loginAutomatico:', error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}
# Bot Playwright — Automatización AXA Colpatria

Bot de automatización web con **Node.js + Express + Playwright** que llena el formulario de afiliación de trabajadores en el portal ARL de AXA Colpatria, descarga el comprobante PDF y devuelve el resultado al sistema Blinden (Laravel).

---

## Arquitectura general

```
sistema-blindem (Laravel)
  │
  ├── Livewire: Crear.php / Ver.php
  │     │
  │     ▼
  │   AxaJsonMapper.php  →  transforma Preafiliacion → array
  │   AxaBotService.php  →  POST al bot, procesa respuesta
  │
  └───── POST http://localhost:3000/login ──────────────────┐
                                                            ▼
bot-playwright (Node.js)
  │
  ├── index.js                 (Express, puerto 3000)
  ├── routes/login.js          (ruteo)
  ├── services/loginService.js (automatización Playwright)
  └── services/mapas.js        (traducción → códigos formulario)
```

### Flujo completo

```
1. Afiliador llena wizard en sistema-blindem (Livewire)
2. Datos guardados en tabla preafiliaciones (PostgreSQL/Supabase)
3. AxaJsonMapper transforma datos al formato que espera el bot
4. AxaBotService envía JSON a POST /login del bot
5. Bot Playwright abre Chrome, navega al portal AXA, llena formulario
6. Bot hace clic en Ingresar Empleado (btnModificar)
7. Espera modal "Transacción Exitosa", lo cierra
8. Abre comprobante PDF en nueva pestaña, lo captura como base64
9. Devuelve { success, urlComprobante, comprobantePdf, tipoArchivo }
10. Laravel procesa la respuesta y guarda el resultado
```

---

## Requisitos previos

- **Node.js** v18 o superior
- **npm** v9 o superior
- Playwright Chromium instalado:
  ```powershell
  npx playwright install chromium
  ```
- Perfil de Chrome persistente en `C:\Users\JEFE\AppData\Local\PlaywrightProfile`

---

## Instalación

```powershell
cd bot-playwright
npm install
npm start
```

El servidor corre en `http://localhost:3000`.

---

## Endpoint: `POST /login`

### Body completo (todos los campos que recibe el bot)

```json
{
  "email":              "CC94493747",
  "password":           "Portalempresa2026+",
  "cedula":             "1002821393",
  "primerNombre":       "JEFERSON",
  "segundoNombre":      "DAVID",
  "primerApellido":     "MONTENEGRO",
  "segundoApellido":    "MEDINA",
  "fechaNacimiento":    "02/05/2026",
  "genero":             "Masculino",
  "estadoCivil":        "Soltero(a)",
  "departamento":       "GUAVIARE",
  "ciudad":             "SAN JOSE DEL GUAVIARE",
  "direccion":          "VEREDA JULUMITO",
  "telefono":           "",
  "celular":            "3126466563",
  "correo":             "correo@ejemplo.com",
  "fechaIngreso":       "08/05/2026",
  "tipoSalario":        "Básico",
  "salarioBasico":      "546346785",
  "cargo":              "DESARROLLADOR",
  "empresaEnMision":    "EMPLEADOS DE PLANTA",
  "empresaAxa":         "NOMBRE EMPRESA EN AXA",
  "sucursal":           "PRINCIPAL",
  "centroTrabajo":      "CENTRO TRABAJO 01",
  "administradoraEPS":  "SURA E.P.S",
  "administradoraAFP":  "COLPENSIONES",
  "tipoAfiliado":       "Dependiente",
  "grupoOcupacion":     "ARQUITECTOS, INGENIEROS Y AFINES",
  "tipoOcupacion":      "ARQUITECTOS Y URBANISTAS",
  "modalidadTrabajo":   "PRESENCIAL",
  "tareasAltoRiesgo":   "NO APLICA",
  "jornadaCompleta":    "Si"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `email` | string | Usuario del portal AXA |
| `password` | string | Contraseña del portal AXA |
| `cedula` | string | Número de documento del trabajador |
| `primerNombre` | string | |
| `segundoNombre` | string | |
| `primerApellido` | string | |
| `segundoApellido` | string | |
| `fechaNacimiento` | string | Formato `dd/mm/YYYY` |
| `genero` | string | "Masculino" / "Femenino" |
| `estadoCivil` | string | "Soltero(a)", "Casado(a)", etc. |
| `departamento` | string | Nombre del departamento (ej: "VALLE") |
| `ciudad` | string | Nombre de la ciudad |
| `direccion` | string | Dirección de domicilio |
| `telefono` | string | |
| `celular` | string | |
| `correo` | string | Email |
| `fechaIngreso` | string | Formato `dd/mm/YYYY` |
| `tipoSalario` | string | "Básico" / "Integral" |
| `salarioBasico` | string | Salario en números |
| `cargo` | string | Cargo del trabajador |
| `empresaEnMision` | string | Nombre de la empresa en misión |
| `empresaAxa` | string | Nombre de la empresa en el combo de AXA |
| `sucursal` | string | Nombre de la sucursal |
| `centroTrabajo` | string | Nombre del centro de trabajo |
| `administradoraEPS` | string | Nombre legible de la EPS |
| `administradoraAFP` | string | Nombre legible de la AFP |
| `tipoAfiliado` | string | "Dependiente", etc. |
| `grupoOcupacion` | string | Grupo de ocupación |
| `tipoOcupacion` | string | Tipo de ocupación |
| `modalidadTrabajo` | string | "PRESENCIAL", etc. |
| `tareasAltoRiesgo` | string | "NO APLICA", etc. |
| `jornadaCompleta` | string | "Si" / "No" |

### Respuesta exitosa

```json
{
  "success": true,
  "mensaje": "Empleado registrado correctamente en AXA",
  "urlComprobante": "https://portalarl.axacolpatria.co/.../Comprobante",
  "comprobantePdf": "JVBERi0xLjcN... (base64)",
  "tipoArchivo": "pdf"
}
```

### Respuesta con error

```json
{
  "success": false,
  "error": "Ciudad \"CALI\" no encontrada. Disponibles: ..."
}
```

---

## Paso a paso de lo que automatiza el bot

### Fase 1: Login en AXA Colpatria

| Paso | Acción | Detalle |
|------|--------|---------|
| 1 | Abre Chrome | Lanza Chromium con perfil persistente (`headless: false`) |
| 2 | Navega al portal | `aplicaciones.axacolpatria.co` — login ARL |
| 3 | Cierra modal | Si aparece modal de "sesión finalizada", simula clic en `(644, 348)` |
| 4 | Escribe usuario | `getByPlaceholder('USUARIO')` con `pressSequentially` (delay 100ms) |
| 5 | Escribe contraseña | `getByPlaceholder('PASSWORD')` con `pressSequentially` (delay 100ms) |
| 6 | Click INICIAR SESIÓN | `getByRole('button', { name: 'INICIAR SESIÓN' })` |
| 7 | Espera carga | `networkidle` (máx. 60s) + 5s |
| 8 | Selecciona empresa | `#ddlEmpresas` — busca por texto con normalización (quita acentos, case-insensitive) |
| 9 | Click INGRESAR | `input.btn.btn-primary`, espera 8s |
| 10 | Navega a Ingreso Individual | `page.goto()` directo a la URL del formulario |

### Fase 2: Búsqueda del trabajador

| Paso | Acción | Detalle |
|------|--------|---------|
| 11 | Tipo documento | `#TipoIdentificacionSelect` → value `'1'` (Cédula) |
| 12 | Número documento | `#txtNumeroDocumento` → escribe `cedula` con delay |
| 13 | Click BUSCAR | `button.btn-primary.searchHistory` |
| 14 | Cierra modal informativo | `#BtnAceptarModal` si aparece |

### Fase 3: Llenado del formulario (30+ campos)

| # | Campo | Selector | Tipo |
|---|-------|----------|------|
| 1 | Primer nombre | `#txtPrimerNombre` | text |
| 2 | Segundo nombre | `#txtSegundoNombre` | text |
| 3 | Primer apellido | `#txtPrimerApellido` | text |
| 4 | Segundo apellido | `#txtSegundoApellido` | text |
| 5 | Fecha nacimiento | `#dtpFechaNacimiento` | text |
| 6 | Género | `#GeneroSelect` | select (traducido) |
| 7 | Estado civil | `#estadoCivilSelect` | select (traducido) |
| 8 | Departamento | `#DepartamentoSelect` | select (traducido) |
| 9 | Ciudad | `#CiudadSelect` | select (búsqueda por texto exacto, dependiente de depto) |
| 10 | Dirección | `#txtDireccionDomicilio` | text |
| 11 | Teléfono | `#txtTelefono` | text |
| 12 | Celular | `#txtCelular` | text |
| 13 | Email | `#txtEmail` | text |
| 14 | Fecha ingreso | `#dtpFechaIngreso` | text |
| 15 | Tipo salario | `#tipoSalarioSelect` | select (traducido) |
| 16 | Salario | `#Salaraio` | text |
| 17 | Cargo | `#txtCargo` | text |
| 18 | Empresa en misión | `#EmpresasSelect` | select (búsqueda parcial) |
| 19 | Sucursal | `#SucursalSelect` | select (búsqueda parcial, depende de empresa) |
| 20 | Centro trabajo | `#CentroTrabajoSelect` | select (búsqueda parcial, depende de sucursal) |
| 21 | EPS | `#EpsAfiliado` | select (traducido) |
| 22 | AFP | `#AfpAfiliado` | select (traducido) |
| 23 | Tipo afiliado | `#tipoAfiliacionEmpresasSelect` | select (traducido) |
| 24 | Grupo ocupación | `#tipoGrupoOcupacionSelect` | select (traducido) |
| 25 | Tipo ocupación | `#tipoOcupacionEmpresasSelect` | select (búsqueda parcial, con wait extra) |
| 26 | Modalidad trabajo | `#modalidadTrabajoSelect` | select (traducido) |
| 27 | Tareas alto riesgo | `#altoRiesgoSelect` | select (traducido) |
| 28 | Jornada completa | `#rbJornadaIngIndivDependSi/No` | radio button |

### Fase 4: Envío y comprobante

| Paso | Acción | Detalle |
|------|--------|---------|
| 29 | Click Ingresar Empleado | `input#btnModificar` |
| 30 | Espera modal éxito | `#BtnAceptarModal` (timeout 30s) |
| 31 | Cierra modal | Click en `#BtnAceptarModal` |
| 32 | Click Imprimir Comprobante | `input#btnImprimir` — abre nueva pestaña |
| 33 | Captura nueva pestaña | `page.context().waitForEvent('page')` |
| 34 | Obtiene URL del PDF | `nuevaPestana.url()` |
| 35 | Descarga PDF | `nuevaPestana.pdf()` → base64 |
| 36 | Fallback | Si `pdf()` falla, toma screenshot → base64 como PNG |
| 37 | Devuelve resultado | `{ success, mensaje, urlComprobante, comprobantePdf, tipoArchivo }` |

---

## Traducción de valores (mapas.js)

El archivo `services/mapas.js` contiene el mapeo de nombres legibles a los valores que espera cada `<select>` del formulario AXA.

### Categorías

| Categoría | Ejemplo entrada → salida |
|---|---|
| `Genero` | "Masculino" → `"M"` |
| `EstadoCivil` | "Soltero(a)" → `"1"` |
| `CodigoDepartamento` | "VALLE" → `"76"` |
| `TipoSalario` | "Básico" → `"1"` |
| `EpsAfiliado` | "SURA E.P.S" → `"10"` |
| `AfpAfiliado` | "PORVENIR" → `"3"` |
| `TipoAfiliacion` | "Dependiente" → `"1"` |
| `GrupoOcupacion` | "ARQUITECTOS, INGENIEROS Y AFINES" → `"86"` |
| `ModalidadTrabajo` | "PRESENCIAL" → `"01"` |
| `TareaAltoRiesgo` | "NO APLICA" → `"0000001"` |

### Funciones

- `obtenerValor(campo, nombre)` — busca el nombre en el mapa, **lanza error** si no existe con lista de opciones disponibles
- `obtenerValorSeguro(campo, nombre)` — igual pero devuelve `null` en vez de error

### Patrón para selects dependientes

Los selects que dependen de otro (Ciudad ← Departamento, Sucursal ← Empresa, Centro Trabajo ← Sucursal, Tipo Ocupación) siguen este patrón:

1. `waitForFunction` — esperar a que el `<select>` tenga >1 opción (timeout 10-15s)
2. `page.$eval` — buscar en las `options` del DOM:
   - Coincidencia **exacta** (`===`) para Ciudad
   - Coincidencia **parcial** (`.includes()`) para Sucursal, Centro Trabajo
   - Coincidencia **parcial con normalización ASCII** para Tipo Ocupación
   - Todas son **case-insensitive** y sin acentos
   - Si no encuentra: lanza `Error` con lista de opciones disponibles
3. `selectOption` con el `value` encontrado

---

## AxaJsonMapper.php (lado Laravel)

Transforma un modelo `Preafiliacion` (con relaciones `empresa.entidades` cargadas) al array que espera el bot.

### Mapeo de campos

| Campo del mapper | Origen | Ejemplo |
|---|---|---|
| `email` | `$entidadArl->pivot->usuario` | "CC94493747" |
| `password` | `$entidadArl->pivot->contrasena` | "Portalempresa2026+" |
| `cedula` | `$pre->numero_documento` | "1002821393" |
| `primerNombre` | `parseNombres()[0]` | "JEFERSON" |
| `segundoNombre` | `parseNombres()[1]` | "DAVID" |
| `primerApellido` | `parseNombres()[2]` | "MONTENEGRO" |
| `segundoApellido` | `parseNombres()[3]` | "MEDINA" |
| `genero` | `match($pre->genero)` | M → "Masculino" |
| `estadoCivil` | `match($pre->estado_civil)` | soltero → "Soltero(a)" |
| `departamento` | `normalizarDepartamento()` | "VALLE DEL CAUCA" → "VALLE" |
| `ciudad` | `quitarAcentos()` | "POPAYÁN" → "POPAYAN" |
| `administradoraEPS` | `normalizarEps($entidadEps->nombre)` | "NUEVA EPS" → "NUEVA E.P.S. S.A." |
| `administradoraAFP` | `$entidadAfp->nombre` | "COLPENSIONES" |
| `empresaAxa` | `$empresa->nombre` | Nombre real para combo AXA |

### Método `normalizarEps()`

Normaliza nombres cortos/comunes de EPS a su nombre oficial en el formulario AXA:

| Entrada | Salida |
|---|---|
| "NUEVA EPS" | "NUEVA E.P.S. S.A." |
| "SURA" / "EPS SURA" | "SURA E.P.S" |
| "SANITAS" | "E.P.S. SANITAS S.A." |
| "COMPENSAR" | "COMPENSAR E.P.S." |
| "FAMISANAR" | "E.P.S. FAMISANAR LTDA." |
| "COOMEVA" | "COOMEVA E.P.S. SA" |
| "SALUD TOTAL" | "SALUD TOTAL S.A. E.P.S" |
| "CRUZ BLANCA" | "CRUZ BLANCA E.P.S. SA" |
| ... | etc. |

Si el nombre no coincide con ninguna clave del mapa, devuelve el nombre en mayúsculas tal cual (para detectar el nombre real del portal en el error).

---

## Estructura del proyecto

```
bot-playwright/
├── index.js                          # Entry point — servidor Express
├── package.json                      # Dependencias y scripts
├── AGENTE.md                         # Reglas para agente de IA
├── README.md                         # Esta documentación
│
├── routes/
│   ├── login.js                      # Ruta POST /login (redirige a loginService)
│   └── afiliar.js                    # Ruta POST /afiliar (en desarrollo)
│
├── controllers/
│   └── afiliacionController.js       # Validación y orquestación de afiliación
│
├── services/
│   ├── loginService.js               # CORAZÓN: automatización completa del flujo
│   └── axaService.js                 # Afiliación en portal principal (WIP)
│   └── mapas.js                      # Traducción nombres legibles → códigos AXA
│
├── utils/
│   └── browser.js                    # Utilidad compartida de navegador
│
├── temp_get_form.js                  # Script temporal de depuración
└── test.txt                          # Placeholder
```

### Archivos del lado Laravel (sistema-blindem)

```
sistema-blindem/
├── app/Services/
│   ├── AxaJsonMapper.php             # Mapea Preafiliacion → JSON del bot
│   └── AxaBotService.php             # Envía JSON al bot vía HTTP POST
├── app/Livewire/Afiliaciones/Preafiliaciones/
│   ├── Crear.php                     # Llama al bot al guardar/editar
│   └── Ver.php                       # Llama al bot al aprobar + botón manual
├── config/services.php               # Config: axa_bot.url
└── resources/views/livewire/.../ver.blade.php  # Botón "Enviar a AXA"
```

---

## Configuración

### URL del bot (Laravel)

`config/services.php`:
```php
'axa_bot' => [
    'url' => env('AXA_BOT_URL', 'http://localhost:3000'),
],
```

### Perfil de Chrome (Playwright)

Ruta en `services/loginService.js`:
```js
'C:\\Users\\JEFE\\AppData\\Local\\PlaywrightProfile'
```
Perfil persistente que mantiene sesiones de Chrome entre ejecuciones (evita 2FA).

### Tiempos importantes

| Acción | Timeout |
|---|---|
| HTTP Laravel → bot | 120s |
| `networkidle` post-login | 60s |
| `waitForFunction` selects dependientes | 10s |
| `waitForFunction` tipo ocupación | 15s (+2s pre-delay) |
| Modal "Transacción Exitosa" | 30s |
| Botón "Imprimir Comprobante" | 15s |
| Delays entre tipeos | 50-100ms |

---

## Pruebas y verificación

### Desde Tinker (Laravel)

```php
$pre = \App\Models\Preafiliacion::with('empresa.entidades')->find(5);
$mapper = new \App\Services\AxaJsonMapper();
$datos = $mapper->mapear($pre);
// ↑ Muestra el JSON generado

$bot = new \App\Services\AxaBotService();
$resultado = $bot->afiliar($datos);
// ↑ Muestra el resultado del bot

dd($resultado);
```

### Probar el bot directamente con PowerShell

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/login" `
  -ContentType "application/json" `
  -Body '{"email":"CC94493747","password":"Portalempresa2026+","cedula":"1002821393"}'
```

### Con curl

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"CC94493747","password":"Portalempresa2026+","cedula":"1002821393"}'
```

---

## Manejo de errores

### 1. Error de conexión (servidor bot caído)
- Laravel captura `\Exception`
- Mensaje: `"Error de conexión con el bot AXA: ..."`

### 2. Error HTTP (bot responde con status no 2xx)
- `$response->body()` se incluye en el mensaje

### 3. Error del bot (success: false)
- Se extrae `$json['error']` del body
- Ej: `"Error en el bot: Ciudad "CALI" no encontrada..."`

### 4. EPS no encontrada en normalización
- El mapper devuelve el nombre en mayúsculas tal cual
- El error de `mapas.js` mostrará el nombre exacto que llegó del portal
- Se agrega la entrada faltante al mapa `normalizarEps()` en `AxaJsonMapper.php`

### 5. Excepción no capturada en loginService.js
- El `try/catch` en `index.js` responde con status 500
- El proceso de Node no muere

---

## Estado del proyecto

### ✅ Completado
- Login automático en AXA Colpatria (usuario + contraseña + selección de empresa)
- Llenado completo del formulario de Ingreso Individual (30+ campos)
- Traducción de valores legibles a códigos del formulario (mapas.js)
- Selección por texto en selects dependientes (ciudad, sucursal, centro trabajo, tipo ocupación)
- AxaJsonMapper genera JSON correctamente desde la BD
- EPS y AFP se leen desde entidades asociadas a la empresa
- Credenciales AXA desde `empresa_entidades.pivot`
- Normalización de departamentos (VALLE DEL CAUCA → VALLE) y EPS (NUEVA EPS → NUEVA E.P.S. S.A.)
- Envío del formulario (click en Ingresar Empleado)
- Captura de comprobante PDF en base64 (con fallback a screenshot PNG)
- Cierre de modal de "Transacción Exitosa"
- AxaBotService verifica `$json['success']` del bot

### 🔧 En progreso / pendiente
- ~~Botón "Enviar a AXA" en Ver.php~~ (ya implementado en Livewire)
- ~~Guardar resultado en columnas `axa_bot_estado`, `axa_bot_mensaje`, `axa_bot_enviado_at`~~ (ya implementado)
- Guardar comprobante PDF en `storage/app/public/axa_comprobantes/` desde Laravel
- Mostrar comprobante en la vista `Ver.php`
- Botón "Generar JSON AXA" en Ver.php (previsualizar antes de enviar)

---

## Comandos útiles

```powershell
# Iniciar servidor
npm start

# Instalar Chromium para Playwright
npx playwright install chromium

# Abrir Playwright Inspector para debug
$env:PWDEBUG=1; npm start

# Generar selectores automáticamente (Codegen)
npx playwright codegen https://portalarl.axacolpatria.co

# Ver navegadores instalados
npx playwright install --list
```

---

## Notas técnicas

### Perfil persistente
`loginService.js` usa `chromium.launchPersistentContext()` con ruta fija. Esto mantiene sesiones y cookies entre ejecuciones.

### Modo headless
Actualmente `headless: false` para depuración visual. Para producción, cambiar a `headless: true`.

### Selectores frágiles
Los selectores (`#txtPrimerNombre`, `.btn-primary`, etc.) dependen de la estructura HTML del sitio de AXA. Si cambian, usar Playwright Codegen para actualizarlos.

### Anti-detección
Se usa `--disable-blink-features=AutomationControlled` para evitar detección básica de bots. Sitios con reCAPTCHA pueden requerir intervención manual.

---

## Solución de problemas

| Problema | Causa | Solución |
|---|---|---|
| Chrome no se abre | Chromium no instalado | `npx playwright install chromium` |
| "Cannot find module" | Dependencias no instaladas | `npm install` |
| Selector no encuentra elemento | Sitio cambió | Usar Codegen para selectores actualizados |
| Puerto 3000 en uso | Otro proceso | Cambiar `PORT` en `index.js` o matar proceso |
| EPS no se traduce | No está en `normalizarEps()` | Agregar entrada al mapa en AxaJsonMapper.php |
| Valor no encontrado en mapas.js | No está en el mapa | El error muestra las opciones disponibles, agregar la faltante |

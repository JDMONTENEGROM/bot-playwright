# Flujo de Integración: Sistema Blinden → Bot AXA Playwright

## Cómo se conectó la aplicación con el bot (paso a paso)

### 1. Creación del bot Node.js (bot-playwright)

Se creó un proyecto Node.js independiente con:

- **Express** como servidor HTTP en el puerto 3000
- **Playwright** para controlar Chrome y automatizar el portal de AXA Colpatria
- Un endpoint `POST /login` que recibe JSON y ejecuta la automatización

### 2. Configuración en Laravel (sistema-blindem)

Se crearon 3 archivos en el Laravel existente:

| Archivo | Función |
|---|---|
| `app/Services/AxaJsonMapper.php` | Toma los datos de la BD (modelo `Preafiliacion`) y los transforma al formato que el bot espera |
| `app/Services/AxaBotService.php` | Envía el JSON al bot vía HTTP POST y procesa la respuesta |
| `config/services.php` (modificado) | Se agregó `'axa_bot' => [ 'url' => env('AXA_BOT_URL', 'http://localhost:3000') ]` |

### 3. Cómo se dispara

Desde los componentes Livewire existentes (`Crear.php` y `Ver.php`) se agregaron llamadas a estos servicios:

```php
$mapper = new \App\Services\AxaJsonMapper();
$bot    = new \App\Services\AxaBotService();

$datos     = $mapper->mapear($pre);      // Preafiliacion → array
$resultado = $bot->afiliar($datos);       // array → POST al bot → respuesta
```

### 4. El mapper traduce los datos

`AxaJsonMapper::mapear()` convierte cada campo del modelo `Preafiliacion` al nombre exacto que el bot espera:

- **Credenciales AXA** → se leen desde la entidad ARL vinculada a la empresa (`empresa_entidades.pivot`)
- **Nombres** → se parten desde `nombres_completos`
- **Género, estado civil, tipo salario** → se traducen con `match()` (M → "Masculino", etc.)
- **Departamentos** → se normalizan ("VALLE DEL CAUCA" → "VALLE") y se quitan acentos
- **EPS y AFP** → se leen automáticamente desde las entidades de la empresa y se normalizan ("SURA" → "SURA E.P.S")
- **Empresa en AXA** → se envía el nombre real (`$empresa->nombre`) para seleccionarla en el combobox del portal

### 5. El bot hace la automatización

`AxaBotService::afiliar()` envía todo el JSON al bot con un solo POST:

```
POST http://localhost:3000/login
Body: { email, password, cedula, primerNombre, ..., jornadaCompleta }
Timeout: 120 segundos
```

El bot (Playwright) abre Chrome, hace login en AXA, navega al formulario de afiliación y llena cada campo.

### 6. La respuesta viaja de vuelta

```
Bot responde: { success: true/false, url: "...", error: "..." }
       ↓
AxaBotService lo recibe, extrae success
       ↓
Si success = true  → "Empleado registrado correctamente en AXA"
Si success = false → "Error en el bot: " + error
       ↓
El resultado se guarda en las columnas:
  axa_bot_estado, axa_bot_mensaje, axa_bot_enviado_at
```

### 7. Resumen de archivos creados/modificados

```
sistema-blindem/
├── app/Services/
│   ├── AxaJsonMapper.php    (NUEVO)
│   └── AxaBotService.php    (NUEVO)
├── app/Livewire/Afiliaciones/Preafiliaciones/
│   ├── Crear.php            (MODIFICADO - agrega llamada al bot)
│   └── Ver.php              (MODIFICADO - agrega llamada al bot y método ejecutarBotAxa)
├── routes/web.php           (sin cambios - usa rutas existentes)
└── config/services.php      (MODIFICADO - agrega axa_bot.url)

bot-playwright/
├── index.js                 (NUEVO - servidor Express con POST /login)
├── services/
│   ├── loginService.js      (NUEVO - automatización con Playwright)
│   └── mapas.js             (NUEVO - traducción de valores legibles a códigos)
├── package.json             (NUEVO)
└── DOCUMENTACION_FLUJO.md   (NUEVO - esta documentación)
```

---

## 1. Flujo Completo (visión general)

```
Afiliador llena wizard en sistema-blindem
        ↓
Datos se guardan en tabla preafiliaciones (PostgreSQL/Supabase)
        ↓
AxaJsonMapper transforma los datos al formato AXA
        ↓
AxaBotService envía el JSON a localhost:3000/login
        ↓
Bot Playwright abre Chrome y llena el formulario de AXA
        ↓
Empleado queda registrado en AXA Colpatria
```

---

## 2. Lado Laravel (sistema-blindem)

### 2.1. Disparadores

El flujo se inicia desde tres puntos:

| Componente | Método | Cuándo se ejecuta |
|---|---|---|
| `Crear.php` | `guardar()` | Al guardar una nueva preafiliación o al editar una existente |
| `Ver.php` | `aprobar()` | Al aprobar una preafiliación |
| `Ver.php` | `ejecutarBotAxa()` | Botón manual "Enviar a AXA" (en desarrollo) |

### 2.2. AxaJsonMapper (mapear)

Toma un modelo `Preafiliacion` (con sus relaciones `empresa.entidades` cargadas) y lo transforma en un array plano. Los pasos clave:

1. **Extrae credenciales** → `email` y `password` desde la entidad ARL vinculada a la empresa (`$entidadArl->pivot->usuario/contrasena`)
2. **Parsea nombres** → Divide `nombres_completos` en hasta 4 partes (primer nombre, segundo nombre, primer apellido, segundo apellido)
3. **Traduce códigos** → Género (M→Masculino), Estado Civil (soltero→Soltero(a)), Tipo Salario, etc.
4. **Normaliza textos** → Departamentos con `normalizarDepartamento()` (ej: "VALLE DEL CAUCA" → "VALLE") y entidades con `normalizarEntidad()` (ej: "EPS SURA" → "SURA E.P.S")
5. **Limpia acentos** → `quitarAcentos()` sobre departamento y ciudad (ej: "POPAYÁN" → "POPAYAN")

### 2.3. AxaBotService (afiliar)

Recibe el array mapeado y hace una sola petición HTTP:

- **Endpoint:** `POST {base_url}/login` (default `http://localhost:3000/login`)
- **Timeout:** 120 segundos (el bot abre navegador real)
- **Body:** Todo el array de datos del empleado
- **Respuesta esperada:** `{ "success": true/false, "url": "...", "error": "..." }`
- **Manejo:**
  - Lee `$json['success']` del bot
  - Si `true` → `"Empleado registrado correctamente en AXA"`
  - Si `false` → `"Error en el bot: " + $json['error']`

---

## 3. Lado Node.js (bot-playwright)

### 3.1. Servidor Express (index.js)

- Puerto `3000`
- Endpoint `POST /login`:
  - Recibe el JSON del empleado
  - Llama a `loginAutomatico(req.body)`
  - Responde con `{ success, url }` o status 500 si hay excepción
- Endpoint `POST /afiliar` (router separado, para otros casos)

### 3.2. loginService.js — loginAutomatico(data)

El corazón de la automatización. Flujo secuencial:

```
1. Traducir valores legibles a códigos del formulario
   └─► mapas.js (obtenerValor)
   └─► Convierte "SURA E.P.S" → "10", "PORVENIR" → "3", etc.

2. Lanzar Chrome persistente con perfil guardado
   └─► chromium.launchPersistentContext

3. Navegar al login de AXA Colpatria
   └─► https://aplicaciones.axacolpatria.co/...

4. Autenticarse (email + password)
   └─► click, pressSequentially, click "INICIAR SESIÓN"

5. Cerrar modal de sesión finalizada si aparece

6. Navegar a Ingreso Individual
   └─► https://portalarl.axacolpatria.co/PortalARL/...

7. Buscar empleado por cédula
   └─► Seleccionar TipoDoc = Cédula, escribir #, click BUSCAR

8. Llenar formulario (30+ campos):
   ├─► Textos: nombre, dirección, teléfono, email, salario, cargo...
   ├─► Selects directos (traducidos): género, estado civil, departamento,
   │   tipo salario, EPS, AFP, tipo afiliado, grupo ocupación,
   │   modalidad trabajo, alto riesgo
   └─► Selects con búsqueda por texto (coincidencia parcial):
       ├─ Ciudad          (depende de departamento)
       ├─ Empresa en Misión
       ├─ Sucursal        (depende de empresa)
       ├─ Centro Trabajo  (depende de sucursal)
       └─ Tipo Ocupación  (con wait extra de 2s + 15s timeout)

9. Jornada laboral (Si/No)

10. Screenshot de resultado

11. Devolver { success, url }
```

### 3.3. Patrón de selección por texto

Para selects dependientes (Ciudad, Empresa, Sucursal, Centro Trabajo, Tipo Ocupación) se usa este patrón:

```
1. waitForFunction: esperar a que el <select> tenga >1 opción (10-15s timeout)
2. page.$eval: buscar en las options del DOM
   - Coincidencia exacta (===) para Ciudad
   - Coincidencia parcial (.includes()) para los demás
   - Case-insensitive
   - Si no encuentra: lanzar Error con lista de disponibles
   - Se filtra "Seleccione una opción" de los disponibles
3. selectOption con el value encontrado
```

### 3.4. mapas.js — Traducción de valores legibles

Archivo que mapea nombres humanos a los valores que espera el formulario AXA:

| Categoría | Ejemplo entrada | Ejemplo salida |
|---|---|---|
| Género | "Masculino" | "M" |
| Estado Civil | "Soltero(a)" | "1" |
| Departamento | "VALLE" | "76" |
| Tipo Salario | "Básico" | "1" |
| EPS | "SURA E.P.S" | "10" |
| AFP | "PORVENIR" | "3" |
| Tipo Afiliado | "Dependiente" | "1" |
| Grupo Ocupación | "ARQUITECTOS, INGENIEROS Y AFINES" | "86" |
| Modalidad Trabajo | "PRESENCIAL" | "01" |
| Tareas Alto Riesgo | "NO APLICA" | "0000001" |

---

## 4. Lo que ya funciona ✅

- Wizard completo guarda datos en BD
- Bot hace login en AXA y llena todo el formulario
- Selección por texto en ciudad, sucursal y centro de trabajo (sin valores numéricos)
- AxaJsonMapper genera el JSON correctamente desde BD
- EPS y AFP se leen automáticamente desde las entidades asociadas a la empresa
- Credenciales AXA se leen desde `empresa_entidades.pivot`
- Normalización de departamentos (VALLE DEL CAUCA → VALLE)
- AxaBotService verifica correctamente si el bot tuvo éxito (`$json['success']`)
- Bot devuelve `{ success, url }` y Laravel lo interpreta
- Mapeo de tipo ocupación por texto desde el JSON de datos

## 5. Lo que está en progreso 🔧

- Normalización de acentos en ciudad (POPAYÁN → POPAYAN) — `quitarAcentos()` ya implementado
- Botón "Enviar a AXA" en Ver.php con su botón en `ver.blade.php`
- Guardar resultado del bot en columnas `axa_bot_estado`, `axa_bot_mensaje`, `axa_bot_enviado_at`
- Devolver screenshot en base64 desde el bot y mostrarlo en la vista
- Guardar screenshot en `storage/app/public/axa_screenshots/` desde Laravel

## 6. Pendiente ⏳

- Agregar campos al paso 4 del wizard (grupo ocupación, modalidad, tareas alto riesgo) — si aplica
- Botón "Generar JSON AXA" en Ver.php y `ver.blade.php` (para previsualizar lo que se enviará)
- Certificado PDF: cuando AXA genere el certificado de afiliación, el bot podría descargarlo
- Commit y push de todo a `feat/generador-json-axa`

---

## 7. Cómo verificar que el bot funciona

### 7.1. Prueba desde Tinker (Laravel)

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

### 7.2. Ejemplo real de JSON generado (desde Tinker)

```php
$datos = $mapper->mapear($pre);
// Resultado:
[
    "email"              => "CC94493747",
    "password"           => "Portalempresa2026+",
    "cedula"             => "1002821393",
    "tipoDocumento"      => "Cédula",
    "primerNombre"       => "JEFERSON",
    "segundoNombre"      => "DAVID",
    "primerApellido"     => "MONTENEGRO",
    "segundoApellido"    => "MEDINA",
    "fechaNacimiento"    => "02/05/2026",
    "genero"             => "Masculino",
    "estadoCivil"        => "Soltero(a)",
    "departamento"       => "GUAVIARE",
    "ciudad"             => "SAN JOSE DEL GUAVIARE",
    "direccion"          => "VEREDA JULUMITO",
    "telefono"           => "",
    "celular"            => "3126466563",
    "correo"             => "jefersondavid3003@gmail.com",
    "fechaIngreso"       => "08/05/2026",
    "tipoSalario"        => "Básico",
    "salarioBasico"      => "546346785",
    "cargo"              => "DESARROLLADOR ",
    "empresaEnMision"    => "EMPLEADOS DE PLANTA",
    "sucursal"           => "PRINCIPAL",
    "centroTrabajo"      => "CENTRO TRABAJO 01",
    "administradoraEPS"  => "SURA E.P.S",
    "administradoraAFP"  => "COLPENSIONES",
    "tipoAfiliado"       => "Dependiente",
    "grupoOcupacion"     => "ARQUITECTOS, INGENIEROS Y AFINES",
    "tipoOcupacion"      => "ARQUITECTOS Y URBANISTAS",
    "modalidadTrabajo"   => "PRESENCIAL",
    "tareasAltoRiesgo"   => "NO APLICA",
    "jornadaCompleta"    => "Si",
]
```

### 7.3. Respuesta del bot (éxito)

```php
$resultado = $bot->afiliar($datos);
// Resultado:
[
    "exito"   => true,
    "mensaje" => "Empleado registrado correctamente en AXA",
    "datos"   => [
        "success" => true,
        "url"     => "https://portalarl.axacolpatria.co/PortalARL/EmpleadoDependiente/IngresoIndividual",
    ],
]
```

### 7.4. Respuesta del bot (error)

```php
// Si falla la búsqueda de ciudad:
[
    "exito"   => false,
    "mensaje" => "Error en el bot: Ciudad "CALI" no encontrada. Disponibles: ...",
    "datos"   => [
        "success" => false,
        "error"   => "Ciudad "CALI" no encontrada...",
    ],
]
```

### 7.5. Visualización del resultado

Actualmente el bot ya genera un screenshot automático (`login-resultado.png`) al finalizar.

**A corto plazo** — se puede:
1. Devolver el screenshot en base64 en la respuesta del bot
2. Guardarlo en `storage/app/public/axa_screenshots/` desde `AxaBotService`
3. Mostrar la imagen en la vista `Ver.php`

**A largo plazo** — cuando AXA genere el certificado de afiliación, el bot podría descargarlo como PDF y devolverlo adjunto.

---

## 8. Estructura de la tabla preafiliaciones (columnas AXA)

| Columna | Tipo | Propósito |
|---|---|---|
| `axa_bot_estado` | `string nullable` | `exitoso`, `fallido`, o `null` |
| `axa_bot_mensaje` | `text nullable` | Mensaje del resultado del bot |
| `axa_bot_enviado_at` | `timestamp nullable` | Fecha/hora del último envío |

Estas columnas se actualizan desde `Ver.php` cuando se ejecuta `ejecutarBotAxa()`.

---

## 9. Configuración

### 9.1. URL del bot (Laravel)

`config/services.php` o variable de entorno:
```php
'axa_bot' => [
    'url' => env('AXA_BOT_URL', 'http://localhost:3000'),
],
```

### 9.2. Perfil de Chrome (Playwright)

Ruta fija en `loginService.js:36`:
```
C:\Users\JEFE\AppData\Local\PlaywrightProfile
```
Este perfil persistente mantiene sesiones de Chrome para no requerir 2FA cada vez.

### 9.3. Tiempos importantes

| Acción | Tiempo |
|---|---|
| Timeout HTTP (Laravel → bot) | 120s |
| Wait networkidle después de login | 60s |
| WaitForFunction selects dependientes | 10s |
| WaitForFunction tipoOcupacion | 15s (con 2s pre delay) |
| Delays entre tipeos | 50-100ms |

---

## 10. Manejo de Errores

### 10.1. Error de conexión (servidor bot caído)
- Laravel captura `\Exception`
- Mensaje: `"Error de conexión con el bot AXA: ..."`

### 10.2. Error HTTP (bot responde con status no 2xx)
- `$response->body()` se incluye en el mensaje

### 10.3. Error del bot (success: false)
- Se extrae `$json['error']` del body de la respuesta
- Ejemplo: `"Error en el bot: Ciudad "CALI" no encontrada..."`

### 10.4. Excepción no capturada en loginService.js
- El `try/catch` en `index.js` responde con status 500
- Evita que el proceso de Node muera

# Bot Playwright — Automatización AXA Colpatria

Proyecto de automatización web con **Node.js + Express + Playwright** para interactuar con los portales de AXA Colpatria (autenticación y afiliación de trabajadores).

---

## Arquitectura

```
cliente HTTP
     │
     ▼
  index.js  (Express, puerto 3000)
     │
     ├── POST /login  ──► routes/login.js ──► services/loginService.js
     │                                            (Playwright)
     │
     └── POST /afiliar ──► routes/afiliar.js ──► controllers/afiliacionController.js
                                                       │
                                               services/axaService.js
                                                    (Playwright)
```

### Flujo de datos

1. El cliente envía un `POST` con JSON al servidor Express.
2. Express parsea el body y enruta la petición.
3. La ruta delega en un controlador (afiliar) o directamente en un servicio (login).
4. El servicio abre una instancia de Chromium con Playwright y automatiza las acciones en el portal web de AXA Colpatria.
5. Se toma una captura de pantalla como evidencia.
6. El resultado se retorna como JSON al cliente.

---

## Requisitos previos

- **Node.js** v18 o superior
- **npm** v9 o superior
- Playwright Chromium instalado:
  ```powershell
  npx playwright install chromium
  ```
- Perfil de Chrome persistente en `C:\Users\JEFE\AppData\Local\PlaywrightProfile` (usado por loginService)

---

## Instalación

```powershell
# 1. Clonar o copiar el proyecto
cd bot-playwright

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor
npm start
```

El servidor corre en `http://localhost:3000`.

---

## Herramientas utilizadas

### Node.js
Entorno de ejecución de JavaScript del lado del servidor. Se usa como base para toda la aplicación.

- **Instalación:** Descargar desde [nodejs.org](https://nodejs.org/) (v18 o superior).
- **Uso en el proyecto:** Ejecuta el servidor Express y los scripts de automatización.

### npm
Administrador de paquetes de Node.js. Se usa para instalar y gestionar las dependencias del proyecto.

- **Instalación:** Viene incluido con Node.js.
- **Uso en el proyecto:**
  ```powershell
  npm install          # Instala dependencias del proyecto
  npm start            # Inicia el servidor
  ```

### Express
Framework web minimalista para Node.js. Provee el servidor HTTP y el sistema de rutas.

- **Instalación:** Se instala automáticamente con `npm install` desde `package.json`.
- **Uso en el proyecto:** Crea los endpoints REST `POST /login` y `POST /afiliar`, parsea JSON y enruta las peticiones a los controladores/servicios.

### Playwright
Librería de automatización de navegadores de Microsoft. Permite controlar Chromium mediante código.

- **Instalación:**
  ```powershell
  npm install playwright          # Ya incluido en package.json
  npx playwright install chromium  # Descarga el binario de Chromium
  ```
- **Uso en el proyecto:**
  - `loginService.js` — Abre Chromium con perfil persistente, navega al portal AXA, llena formularios de login y búsqueda de trabajadores.
  - `axaService.js` — Abre Chromium, navega al sitio principal de AXA y automatiza el formulario de afiliación.
- **Comandos útiles de Playwright:**
  ```powershell
  # Generar selectores automáticamente (Codegen)
  npx playwright codegen https://portalarl.axacolpatria.co

  # Ejecutar en modo debug con inspector
  $env:PWDEBUG=1; npm start

  # Ver la lista de navegadores instalados
  npx playwright install --list
  ```

### PowerShell (Windows) / curl
Cliente HTTP para probar los endpoints.

- **PowerShell:**
  ```powershell
  Invoke-RestMethod -Method POST -Uri "http://localhost:3000/login" `
    -ContentType "application/json" `
    -Body '{"email":"usuario","password":"clave","cedula":"123"}'
  ```
- **curl:**
  ```bash
  curl -X POST http://localhost:3000/login \
    -H "Content-Type: application/json" \
    -d '{"email":"usuario","password":"clave","cedula":"123"}'
  ```

---

## Endpoints

### 1. `POST /login` — Inicio de sesión y búsqueda de trabajador

Automatiza el inicio de sesión en el portal ARL de AXA Colpatria, navega al formulario de Ingreso Individual y busca un trabajador por número de documento.

#### Body de ejemplo

```json
{
  "email": "CC94493747",
  "password": "Portalempresa2026+",
  "cedula": "1234567890"
}
```

| Campo     | Tipo   | Descripción                          |
|-----------|--------|--------------------------------------|
| `email`   | string | Usuario de acceso al portal          |
| `password`| string | Contraseña del portal                |
| `cedula`  | string | Número de documento del trabajador   |

#### Respuesta exitosa

```json
{
  "success": true,
  "url": "https://portalarl.axacolpatria.co/PortalARL/EmpleadoDependiente/IngresoIndividual"
}
```

#### Respuesta con error

```json
{
  "success": false,
  "error": "Error message here"
}
```

#### Paso a paso de lo que automatiza

| Paso | Acción | Detalle |
|------|--------|---------|
| 1 | Abre navegador | Lanza Chromium con perfil persistente (`headless: false`) |
| 2 | Navega al portal | `aplicaciones.axacolpatria.co` — login ARL |
| 3 | Cierra modal | Si aparece un modal de "sesión finalizada", simula clic izquierdo con coordenadas `(644, 348)` |
| 4 | Llena usuario | Escribe `data.email` en el campo `USUARIO` con delay de 100ms entre caracteres |
| 5 | Llena contraseña | Escribe `data.password` en el campo `PASSWORD` con delay de 100ms |
| 6 | Click INICIAR SESIÓN | Hace clic en el botón `INICIAR SESIÓN` |
| 7 | Espera carga | Espera `networkidle` (máx. 60s) + 5s adicionales |
| 8 | Click INGRESAR | Busca `input.btn.btn-primary` y hace clic. Espera 8s |
| 9 | Navega directo | `page.goto()` a la URL de Ingreso Individual |
| 10 | Selecciona tipo doc | `#TipoIdentificacionSelect` → value `'1'` (Cédula) |
| 11 | Llena número doc | Hace clic en `#txtNumeroDocumento` y escribe `data.cedula` con delay |
| 12 | Click BUSCAR | Busca `button.btn-primary.searchHistory` y hace clic |
| 13 | Captura pantalla | Guarda `login-resultado.png` |
| 14 | Decide resultado | Si la URL actual contiene `'Autenticacion'`, falló; si no, éxito |
| 15 | Cierra navegador | Siempre en `finally` |

#### Ejemplo de consumo con PowerShell

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/login" `
  -ContentType "application/json" `
  -Body '{"email":"CC94493747","password":"Portalempresa2026+","cedula":"1234567890"}'
```

#### Ejemplo con curl

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"CC94493747","password":"Portalempresa2026+","cedula":"1234567890"}'
```

---

### 2. `POST /afiliar` — Afiliación de trabajador

> **Nota:** Este endpoint está en fase de desarrollo. Los selectores y pasos deben ajustarse con Playwright Codegen.

Automatiza la afiliación de un trabajador en el portal principal de AXA Colpatria.

#### Body de ejemplo

```json
{
  "trabajador": {
    "num_doc": "1234567890",
    "nombre": "Juan",
    "apellido": "Pérez",
    "tipo_doc": "CC",
    "fecha_ingreso": "2024-01-15"
  }
}
```

| Campo              | Tipo   | Descripción                     |
|--------------------|--------|----------------------------------|
| `trabajador`       | object | Datos del trabajador a afiliar  |
| `trabajador.num_doc`| string| Número de documento             |
| `trabajador.nombre` | string| Primer nombre                   |

#### Respuesta exitosa

```json
{
  "status": "ok"
}
```

#### Respuesta con error

```json
{
  "error": "Trabajador is required"
}
```

#### Paso a paso de lo que automatiza

| Paso | Acción | Estado |
|------|--------|--------|
| 1 | Abre navegador | Chromium `headless: false` |
| 2 | Navega a `axacolpatria.co` | ✅ |
| 3 | Login en el portal | ❌ Pendiente (comentado) |
| 4 | Navegar a afiliación | ❌ Pendiente (comentado) |
| 5 | Llenar formulario | Parcial (solo num_doc y nombre como demo) |
| 6 | Detectar CAPTCHA | ✅ Si hay reCAPTCHA, pausa para intervención manual |
| 7 | Enviar formulario | ❌ Selectores placeholder |
| 8 | Captura de pantalla | ✅ Guarda `resultado.png` |

#### Ejemplo de consumo

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/afiliar" `
  -ContentType "application/json" `
  -Body '{"trabajador":{"num_doc":"1234567890","nombre":"Juan"}}'
```

---

## Estructura del proyecto

```
bot-playwright/
├── index.js                          # Servidor Express (entry point)
├── package.json                      # Dependencias y scripts
├── AGENTE.md                         # Reglas para el agente de IA
├── README.md                         # Esta documentación
│
├── routes/
│   ├── login.js                      # Ruta POST /login
│   └── afiliar.js                    # Ruta POST /afiliar
│
├── controllers/
│   └── afiliacionController.js       # Validación y orquestación de afiliación
│
├── services/
│   ├── loginService.js               # Automatización de login y búsqueda
│   └── axaService.js                 # Automatización de afiliación
│
├── utils/
│   └── browser.js                    # Utilidad compartida de navegador
│
├── temp_get_form.js                  # Script temporal de depuración
├── login-resultado.png               # Screenshot generado por loginService
└── test.txt                          # Archivo placeholder
```

---

## Notas técnicas

### Perfil persistente de Chrome

`loginService.js` usa `chromium.launchPersistentContext()` con una ruta fija de perfil. Esto mantiene sesiones y cookies entre ejecuciones. Si se necesita cambiar la ruta, editar la línea 5 de `services/loginService.js`.

### Modo headless

Actualmente ambos servicios usan `headless: false` para depuración visual. Para producción cambiar a `headless: true` en cada servicio o centralizar la configuración en `utils/browser.js`.

### Selectores frágiles

Los selectores como `.btn-primary`, `#txtNumeroDocumento`, etc., dependen de clases e IDs del sitio de AXA. Si el sitio cambia su estructura HTML, los selectores pueden romperse. Se recomienda revisarlos periódicamente con Playwright Codegen.

### Detección de automatización

Se usa el flag `--disable-blink-features=AutomationControlled` para evitar detección básica de bots. Sin embargo, sitios con protección avanzada (reCAPTCHA, fingerprinting) pueden requerir intervención manual.

---

## Solución de problemas

| Problema | Posible causa | Solución |
|----------|--------------|----------|
| El navegador no se abre | Chromium no instalado | Ejecutar `npx playwright install chromium` |
| Error "Cannot find module" | Dependencias no instaladas | Ejecutar `npm install` |
| El selector no encuentra el elemento | La página cambió o el selector es incorrecto | Usar Playwright Codegen para obtener selectores actualizados |
| reCAPTCHA bloquea | Detección de automatización | Intervenir manualmente cuando el script haga `page.pause()` |
| Puerto 3000 en uso | Otro proceso usando el puerto | Cambiar `PORT` en `index.js` o matar el proceso |

---

## Comandos útiles

```powershell
# Iniciar servidor
npm start

# Instalar Chromium para Playwright
npx playwright install chromium

# Abrir Playwright Inspector para debug
$env:PWDEBUG=1; npm start

# Probar el endpoint de login
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/login" `
  -ContentType "application/json" `
  -Body '{"email":"usuario","password":"clave","cedula":"123"}'
```

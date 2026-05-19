# Reglas del Agente de Desarrollo — Bot Playwright

Este archivo define las reglas y buenas prácticas que el agente debe seguir
en todo momento al desarrollar este proyecto.

---

## 1. Idioma
- Todo el código, comentarios, nombres de variables, funciones y archivos
  se escriben en español.
- Excepciones permitidas: nombres de librerías externas, métodos nativos
  de JavaScript y Playwright.

---

## 2. Estructura de archivos
- Rutas van en `routes/`
- Lógica de negocio va en `services/`
- Validaciones van en `controllers/`
- Utilidades compartidas van en `utils/`
- Nunca mezclar lógica de Playwright dentro de rutas o controladores.

---

## 3. Servicios con Playwright
- Siempre usar `headless: true` en producción, `headless: false` solo
  para depuración.
- Usar `getByRole()`, `getByLabel()` o `locator()` con selectores
  semánticos. Nunca usar selectores frágiles como IDs dinámicos o
  clases CSS generadas automáticamente.
- Siempre esperar `waitForLoadState('networkidle')` después de navegación.
- Siempre tomar screenshot al final con nombre descriptivo.
- Siempre cerrar el navegador en el bloque `finally`.

---

## 4. Manejo de errores
- Todo servicio debe tener bloque `try/catch/finally`.
- Los errores se retornan como `{ success: false, error: mensaje }`.
- Los éxitos se retornan como `{ success: true, datos }`.
- Nunca dejar un `catch` vacío.

---

## 5. Rutas Express
- Siempre validar que el body tenga los campos requeridos antes de llamar
  al servicio.
- Retornar código HTTP apropiado: 200 éxito, 400 datos inválidos,
  500 error interno.
- Nunca poner lógica de Playwright directamente en una ruta.

---

## 6. Commits de Git
- Usar prefijos en español:
  - `feat:` para nuevas funcionalidades
  - `fix:` para correcciones
  - `refactor:` para reorganización de código
  - `docs:` para documentación
  - `test:` para pruebas
- Ejemplo: `feat: agregar servicio de afiliación AXA`

---

## 7. Variables y funciones
- Nombres descriptivos en español. Ejemplo: `iniciarSesion()` no `login()`.
- Evitar abreviaciones confusas.
- Constantes en MAYUSCULAS_CON_GUION: `URL_BASE`, `TIEMPO_ESPERA`.

---

## 8. Archivos prohibidos en Git
- `node_modules/`
- Archivos `.png` (screenshots)
- Archivos `.env`
- Archivos temporales como `temp_*.js`

---

## 9. Antes de cada tarea
El agente debe:
1. Leer este archivo completo.
2. Identificar qué archivos se van a modificar.
3. Mostrar el contenido actual de esos archivos antes de modificarlos.
4. Aplicar solo los cambios solicitados, sin tocar otros archivos.
5. Confirmar los cambios mostrando el contenido final del archivo modificado.

---

## 10. Está prohibido
- Duplicar líneas al editar archivos.
- Dejar llaves `{}` sin cerrar.
- Comentar en inglés.
- Crear archivos fuera de la estructura definida.
- Modificar archivos no relacionados con la tarea.

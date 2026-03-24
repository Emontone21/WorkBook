# Workbook

Gestor de tareas diarias. Aplicación de escritorio construida con **Electron** (y mucho cariño :) ).

## Funcionalidades

- ✅ **Tareas pendientes** — Creá, priorizá y gestioná tareas con estados y comentarios
- ✉ **Correos pendientes** — Registrá correos por estado y redactá respuestas vía Outlook
- ⏱ **Temporizador Pomodoro** — Sesiones de trabajo y descanso configurables
- 📝 **Notas rápidas** — Bloc de notas con autoguardado cada 10 segundos
- 🌙 **Modo oscuro / claro** — Toggle con persistencia entre sesiones

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/workbook.git
cd workbook

# Dentro de la carpeta del proyecto
# Instalar dependencias
npm install

# Ejecutar
npm start
```

## Requisitos

- [Node.js](https://nodejs.org/) v18 o superior
- [npm](https://www.npmjs.com/)

## ⚠️ Dependencia de Windows: envío de correos

El envío de correos vía **"Redactar Correo"** utiliza la integración **Outlook COM** a través de PowerShell.  
Esta funcionalidad **solo está disponible en Windows con Microsoft Outlook instalado y funcionando al momento de usar el modulo**.

En macOS o Linux la aplicación funciona completamente excepto el envío de correos.

## Datos

Todos los datos (tareas, correos, notas, configuración del Pomodoro) se almacenan localmente en `localStorage` de Electron. No se envía ningún dato a servidores externos.

## Tecnologías

- [Electron](https://www.electronjs.org/)
- HTML / CSS / JavaScript vanilla
- Google Fonts: Inter + DM Serif Display

# VDD BDO - Sistema de Valoración de Desempeño

Sistema de valoración de desempeño desarrollado como monolito Node.js con Express y SQLite.

## Características

### Historias de Usuario Implementadas

1. **Carga manual de usuarios e indicadores** - Registro de usuarios, roles e indicadores en la aplicación
2. **Gestión de roles** - Asignación de roles (analista, coordinador, líder) a cada usuario
3. **Visualización de indicadores aplicables** - Filtrado de indicadores por rol del usuario
4. **Registro de notas individuales** - Ingreso de notas por cada indicador
5. **Configuración de porcentajes por usuario** - Definición de porcentajes por indicador por usuario
6. **Cálculo automático del resultado final** - Cálculo basado en indicadores y porcentajes
7. **Visualización del detalle de cálculo** - Desglose de cálculos que componen la nota final
8. **Promedio de notas para coordinadores** - Cálculo mediante promedio de notas del equipo
9. **Exclusión de indicadores no aplicables** - Filtrado de indicadores en promedios
10. **Cálculo del promedio para líderes** - Promedio de coordinadores y roles escalados
11. **Editor de valores globales** - Modificación de valores globales por usuario
12. **Seguimiento del estado del proceso** - Monitoreo del progreso de registro de notas
13. **Validación previa al guardado** - Validación de notas y porcentajes antes de guardar
14. **Exportación de resultados** - Exportación del consolidado de notas en CSV

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
# Instalar dependencias
npm install

# Iniciar el servidor
npm start
```

El servidor estará disponible en `http://localhost:3000`

## Credenciales por defecto

- **Usuario:** admin
- **Contraseña:** admin123

## Estructura del Proyecto

```
├── src/
│   ├── app.js              # Configuración de Express
│   ├── server.js           # Punto de entrada
│   ├── middleware/         # Middleware de autenticación
│   ├── models/             # Modelos de datos (SQLite)
│   ├── routes/             # Rutas de la API
│   └── views/              # Plantillas EJS
├── public/
│   ├── css/                # Estilos CSS
│   └── js/                 # JavaScript del cliente
├── data/                   # Base de datos SQLite (generada)
└── test/                   # Tests
```

## Paleta de Colores (UX/UI Corporativo)

- **Primary:** Azul corporativo `#001F47`
- **Accent:** Azul Pro Blue `#008ACC`
- **Success:** Verde `#7AB929`
- **Warning:** Amarillo `#F1AB00`
- **Error:** Rojo `#C3261F`
- **Highlight:** Fucsia `#C30D5D`
- **Background:** Blanco `#FFFFFF`

## Scripts Disponibles

- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo
- `npm test` - Ejecuta los tests

## Licencia

ISC
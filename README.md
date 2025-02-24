# Discord Bot con Panel de Control Web

Bot de Discord avanzado con panel de control web flexible, almacenamiento de configuración basado en archivos JSON para facilitar la migración y portabilidad.

## Características

- Panel de control web para configuración
- Sistema de comandos Slash
- Sistema de economía (NoxCoins)
- Sistema de conteo con recompensas
- Comandos de diversión con imágenes de anime
- Chat AI usando Google Gemini Pro
- Almacenamiento de configuración en JSON
- Sistema de niveles y experiencia (próximamente)
- Sistema de automoderacion (próximamente)
- Sistema de logs para comandos y eventos (próximamente)

## Tecnologías Utilizadas

- Node.js
- Discord.js
- Express.js
- EJS templating
- JSON file-based storage

## Configuración

1. Clona el repositorio
```bash
git clone [URL-del-repositorio]
```

2. Instala las dependencias
```bash
npm install
```

3. Configura las variables de entorno en un archivo `.env`:
```env
DISCORD_BOT_TOKEN=tu_token_aquí
BOT_CLIENT_ID=tu_client_id_aquí
```

4. Inicia el bot
```bash
node src/index.js
```

## Estructura del Proyecto

```
src/
├── commands/       # Comandos del bot
├── dashboard/      # Panel de control web
├── events/         # Manejadores de eventos
├── handlers/       # Cargadores de comandos y eventos
├── utils/          # Utilidades y helpers
└── data/          # Almacenamiento JSON
```

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios que te gustaría hacer.

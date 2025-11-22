# Videos Service

Service provides simple REST API for managing daily education video program. It keeps fixed playlist (1–60) and tracks which videos are unlocked and viewed by user.

## Endpoints

- `GET /api/education` — returns 60 videos for authorized user with `available`, `viewed`, `unlock_date`, `url`, `title`, etc.
- `POST /api/education/:id/viewed` — marks that user watched selected video.
- `POST /api/education/upload` — accepts `multipart/form-data` (`title`, optional `description`, optional `unlockDate`, and `video` file) and uploads the asset into `public/education-videos`, automatically assigning order, calculating duration, and creating DB entry.

## Development

```bash
pnpm install
pnpm dev
```

Environment variables (or `nitro.config.ts` runtime config):

- `mongoUri` — MongoDB connection string.
- `secret` — JWT secret for verifying `accessToken` cookie.

## Hosting video files

Static assets from `public/` are automatically exposed by Nitro. To serve videos directly from this service:

1. Drop your `.mp4`/`.mov` files into `public/education-videos/`.
2. In the `education_videos` collection set the `url` field to the relative path, e.g. `/education-videos/lesson-1.mp4`.
3. Alternatively, call `POST /api/education/upload` with the file — it places the asset into `public/education-videos/` for you, stores metadata, and works out the duration immediately.
4. `GET /api/education` will convert stored relative paths into absolute URLs based on the incoming request (`https://service.domain/education-videos/lesson-1.mp4`), automatically trying to determine the video duration and caching it back into Mongo.

This keeps all media bundled with the service without any extra CDN configuration.

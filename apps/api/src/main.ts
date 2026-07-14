import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const rawPort = (process.env.PORT ?? '').trim();
  const parsedPort = rawPort.length > 0 ? Number(rawPort) : Number.NaN;

  const port =
    Number.isFinite(parsedPort) && parsedPort >= 0 && parsedPort <= 65535
      ? parsedPort
      : 3000;

  const frontendUrl = process.env.FRONTEND_URL;

  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('Buddy Script API')
    .setDescription('Social media platform system with nestjs')
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}`)
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.use(
    '/documentation',
    apiReference({
      content: document,
    }),
  );

  await app.listen(port, '0.0.0.0');
  console.log(`Server running at http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

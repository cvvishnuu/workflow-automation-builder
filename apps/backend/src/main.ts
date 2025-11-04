/**
 * Main entry point for the NestJS application
 * Configures the server, middleware, and starts listening
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule);

  // Enable CORS - Allow all origins for now (temporary)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe to automatically validate DTOs
  // This enforces validation rules defined with class-validator decorators
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not defined in DTO
      forbidNonWhitelisted: true, // Throw error if extra properties are sent
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert types automatically
      },
    })
  );

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Setup Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Workflow Automation Platform API')
    .setDescription('REST API for managing and executing workflows')
    .setVersion('1.0')
    .addBearerAuth() // Add JWT authentication
    .addTag('workflows', 'Workflow management endpoints')
    .addTag('executions', 'Workflow execution endpoints')
    .addTag('nodes', 'Node definition endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start listening on configured port
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();

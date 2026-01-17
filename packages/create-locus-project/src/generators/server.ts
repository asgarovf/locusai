import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { VERSIONS } from "../constants.js";
import type { ProjectConfig } from "../types.js";
import { ensureDir, writeJson } from "../utils.js";

export async function generateAppServer(config: ProjectConfig) {
  const { projectPath, scopedName } = config;
  const appDir = join(projectPath, "apps/server");
  const srcDir = join(appDir, "src");

  await ensureDir(srcDir);
  await ensureDir(join(appDir, "prisma"));

  await writeJson(join(appDir, "package.json"), {
    name: `${scopedName}/server`,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "nest start --watch",
      build: "nest build",
      start: "nest start",
      "prisma:generate": "prisma generate",
      "prisma:push": "prisma db push",
    },
    dependencies: {
      "@nestjs/common": VERSIONS.nestjs,
      "@nestjs/core": VERSIONS.nestjs,
      "@nestjs/platform-express": VERSIONS.nestjs,
      "@prisma/client": VERSIONS.prismas,
      "reflect-metadata": "^0.2.0",
      rxjs: "^7.8.0",
      [`${scopedName}/shared`]: "workspace:*",
    },
    devDependencies: {
      "@nestjs/cli": VERSIONS.nestjs,
      "@nestjs/schematics": VERSIONS.nestjs,
      "@types/node": VERSIONS.typesNode,
      prisma: VERSIONS.prismas,
      typescript: VERSIONS.typescript,
    },
  });

  await writeJson(join(appDir, "tsconfig.json"), {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      removeComments: true,
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      allowSyntheticDefaultImports: true,
      target: "ESNext",
      sourceMap: true,
      outDir: "./dist",
      baseUrl: "./",
      incremental: true,
      skipLibCheck: true,
      strictNullChecks: false,
      noImplicitAny: false,
      strictBindCallApply: false,
      forceConsistentCasingInFileNames: false,
      noFallthroughCasesInSwitch: false,
    },
    include: ["src"],
  });

  await writeFile(
    join(appDir, ".env.example"),
    'DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"\nPORT=8000\n'
  );
  await writeFile(
    join(appDir, ".env"),
    'DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"\nPORT=8000\n'
  );

  await writeFile(
    join(appDir, "prisma/schema.prisma"),
    `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Task {
  id        Int      @id @default(autoincrement())
  title     String
  status    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`
  );

  await writeFile(
    join(srcDir, "main.ts"),
    `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT || 8000;
  await app.listen(port);
  console.log(\`Application is running on: http://localhost:\${port}\`);
}
bootstrap();
`
  );

  await writeFile(
    join(srcDir, "app.module.ts"),
    `import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`
  );

  await writeFile(
    join(srcDir, "app.controller.ts"),
    `import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
`
  );

  await writeFile(
    join(srcDir, "app.service.ts"),
    `import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
`
  );
}

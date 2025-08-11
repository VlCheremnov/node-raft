import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { ConsoleLogger, ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      timestamp: true,
      compact: false,
    }),
  })

  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT', 3000)

  app.useGlobalPipes(new ValidationPipe())

  await app.listen(port)
}
bootstrap()

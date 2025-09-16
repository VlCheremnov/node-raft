import { IsString } from 'class-validator'

/**
 * Параметры для создания записи в KV хранилище.
 * @class SetKvDto
 * @property {string} key - Ключ
 * @property {string} value - Значение
 */
export class SetKvDto {
  @IsString()
  key: string
  @IsString()
  value: string
}

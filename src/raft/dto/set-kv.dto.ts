import { IsString } from 'class-validator'

/**
 * @class SetKvDto
 * @description Параметры для создания записи в KV хранилище
 * @property {string} key - Ключ
 * @property {string} value - Значение
 */
export class SetKvDto {
  @IsString()
  key: string
  @IsString()
  value: string
}

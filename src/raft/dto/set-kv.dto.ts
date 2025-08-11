import { IsString } from 'class-validator'

/**
 * @typedef {Object} SetKvDto - Параметры создания записи в KV
 * @property {string} key - Ключ
 * @property {string} value - Значение
 */
export class SetKvDto {
  @IsString()
  key: string

  @IsString()
  value: string
}

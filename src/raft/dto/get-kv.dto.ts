import { PickType } from '@nestjs/mapped-types'
import { SetKvDto } from './set-kv.dto'

/**
 * @class - Параметры для получения значения из kv хранилища. Содержит подмножество полей из {@link SetKvDto}
 * @property {string} key - Ключ для получения значения
 */
export class GetKvDto extends PickType(SetKvDto, ['key'] as const) {}

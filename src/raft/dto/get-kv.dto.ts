import { PickType } from '@nestjs/mapped-types'
import { SetKvDto } from './set-kv.dto'

/**
 * @typedef {Object} GetKvDto - Параметры для получения значений из KV
 * */
export class GetKvDto extends PickType(SetKvDto, ['key'] as const) {}

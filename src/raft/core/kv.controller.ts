import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common'
import { RaftService } from './raft.service'
import { GetKvDto } from './../dto/get-kv.dto'
import { SetKvDto } from './../dto/set-kv.dto'

/**
 * @class - Контроллер для обработки запросов к key/value хранилищу.
 */
@Controller('kv')
export class KvController {
  constructor(
    /**
     * Сервис для обработки RAFT-логики.
     * @private
     * @type {RaftService}
     */
    private raftService: RaftService
  ) {}

  /**
   * Обрабатывает запрос Set (Сохранение лог в storage)
   * @http {POST} /kv/set
   * @param {SetKvDto} body - Параметры запроса.
   * @returns {{ success: boolean }} Результат обработки запроса, где success указывает, успешно ли выполнено сохранение
   * @throws {HttpException} Если запрос некорректен (например, неверный term).
   * @example
   * POST /kv/set
   * Body: {
   *   "key": "key",
   *   "value": "value"
   *  }
   * Response: {
   *   "success": true
   * }
   */
  @HttpCode(HttpStatus.OK)
  @Post('set')
  Set(@Body() body: SetKvDto): { success: boolean } {
    const success = this.raftService.setValue(body.key, body.value)
    return { success }
  }

  /**
   * Обрабатывает запрос Get (Получить запись из KV хранилища).
   * @http {POST} /kv/get
   * @param {GetKvDto} body - Параметры запроса.
   * @returns {{ value: string|undefined }} Значение из KV хранилища.
   * @throws {HttpException} Если запрос некорректен (например, неверный term).
   * @example
   * POST /kv/get
   * Body: {
   *   "key": "key",
   *  }
   * Response: {
   *   "value": "value"
   * }
   */
  @HttpCode(HttpStatus.OK)
  @Post('get')
  Get(@Body() body: GetKvDto): { value: string | undefined } {
    return { value: this.raftService.getValue(body.key) }
  }
}

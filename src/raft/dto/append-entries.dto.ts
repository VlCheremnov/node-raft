import { IsInt, ValidateNested, IsOptional, IsString } from 'class-validator'
import { Type } from 'class-transformer'

/**
 * @class - Параметры запроса к фоловеру от лидера на стадии heartbeat
 * @property {number} term - Срок (term) голосования
 * @property {number} leaderId - Id лидера
 * @property {number} prevLogIndex - Последний индекс лога для текущего фоловера у лидера
 * @property {number} prevLogTerm - Последний срок лога для текущего фоловера у лидера
 * @property {number} leaderCommit - Последняя зафикасированная запись у лидера
 * @property {LogEntryDto[]} entries - Список записей начиная с prevLogIndex
 */
export class AppendEntriesDto {
  @IsInt()
  term: number
  @IsInt()
  leaderId: number
  @IsInt()
  prevLogIndex: number
  @IsInt()
  prevLogTerm: number
  @IsInt()
  leaderCommit: number

  @ValidateNested({ each: true })
  @Type(() => LogEntryDto)
  entries: LogEntryDto[]
}

/**
 * @class - Запись консенсуса
 * @property {number} index - Index лога
 * @property {number} term - Срок (term) голосования
 * @property {CommandDto|null} command - Команда записи
 */
export class LogEntryDto {
  @IsInt()
  index: number
  @IsInt()
  term: number

  @IsOptional()
  @ValidateNested()
  @Type(() => CommandDto)
  command: CommandDto | null
}

/**
 * @class - Команда лога
 * @property {string} key - Ключ
 * @property {string} value - Значение
 */
export class CommandDto {
  @IsString()
  key: string
  @IsString()
  value: string
}

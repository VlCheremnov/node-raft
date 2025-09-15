import { IsInt } from 'class-validator'

/**
 * @class RequestVoteParams
 * @description Параметры для выбора кандидата
 * @property {number} term - Срок (term) голосования
 * @property {number} candidateId - ID кандидата
 * @property {number} lastLogIndex - Индекс последнего лога
 * @property {number} lastLogTerm - Последний срок лога
 */
export class RequestVoteDto {
  @IsInt()
  term: number
  @IsInt()
  candidateId: number
  @IsInt()
  lastLogIndex: number
  @IsInt()
  lastLogTerm: number
}

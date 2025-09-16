import fetchMock from 'jest-fetch-mock'
import { Test, TestingModule } from '@nestjs/testing'
import { HttpTransportService } from './http-transport.service'
import { TransportInterface } from './transport.interface'
import { AppendEntriesResult, RequestVoteResult } from '../types'
import { RequestVoteDto } from '../dto/request-vote.dto'
import { AppendEntriesDto } from '../dto/append-entries.dto'

describe('HttpTransportService', () => {
  const host = 'http://localhost'
  let transport: TransportInterface

  beforeEach(async () => {
    fetchMock.resetMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpTransportService],
    }).compile()

    transport = module.get(HttpTransportService)
  })

  describe('requestVote', () => {
    const voteDto: RequestVoteDto = {
      term: 1,
      candidateId: 1,
      lastLogIndex: 0,
      lastLogTerm: 0,
    }

    it('должен отправлять POST-запрос на /raft/request-vote и возвращать результат', async () => {
      const response: RequestVoteResult = { term: 1, voteGranted: true }
      fetchMock.mockResponseOnce(JSON.stringify(response))

      const result = await transport.requestVote(host, voteDto)

      expect(fetchMock).toHaveBeenCalledWith(`${host}/raft/request-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voteDto),
      })
      expect(result).toEqual(response)
    })

    it('должен выбрасывать ошибку при сетевом сбое', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'))

      await expect(transport.requestVote(host, voteDto)).rejects.toThrow(
        'Network error'
      )
    })

    it('должен обрабатывать некорректный JSON в ответе', async () => {
      fetchMock.mockResponseOnce('invalid json')

      await expect(transport.requestVote(host, voteDto)).rejects.toThrow()
    })
  })

  describe('heartbeat', () => {
    const entries: AppendEntriesDto = {
      term: 1,
      leaderId: 1,
      prevLogIndex: 0,
      prevLogTerm: 0,
      entries: [],
      leaderCommit: 0,
    }

    it('должен отправлять POST-запрос на /raft/append-entries и возвращать результат', async () => {
      const response: AppendEntriesResult = { term: 1, success: true }
      fetchMock.mockResponseOnce(JSON.stringify(response))

      const result = await transport.heartbeat(host, entries)

      expect(fetchMock).toHaveBeenCalledWith(`${host}/raft/append-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries),
      })
      expect(result).toEqual(response)
    })

    it('должен выбрасывать ошибку при сетевом сбое', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'))

      await expect(transport.heartbeat(host, entries)).rejects.toThrow(
        'Network error'
      )
    })
  })
})

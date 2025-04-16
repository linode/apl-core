import * as utils from './utils'

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

describe('semverCompare', () => {
  it('should indicate version to be higher', () => {
    expect(utils.semverCompare('1.1.3', '0.1.1')).toEqual(1)
  })
  it('should indicate version to be equal', () => {
    expect(utils.semverCompare('0.1.1', '0.1.1')).toEqual(0)
  })
  it('should indicate version to be lower', () => {
    expect(utils.semverCompare('0.1.1', '1.1.3')).toEqual(-1)
  })
})

describe('ensureTeamGitopsDirectories', () => {
  it('should create .keep files in all team directories', async () => {
    const envDir = '/env/teams'
    const deps: any = {
      writeFile: jest.fn(),
      glob: jest.fn().mockResolvedValue(['/env/teams/team1', '/env/teams/team2']),
    }
    const result = await utils.ensureTeamGitopsDirectories(envDir, deps)
    expect(deps.glob).toHaveBeenCalledWith(`${envDir}/teams/*`)
    expect(deps.writeFile).toHaveBeenCalledTimes(4)
    expect(result).toEqual([
      '/env/teams/team1/sealedsecrets/.keep',
      '/env/teams/team1/workloadValues/.keep',
      '/env/teams/team2/sealedsecrets/.keep',
      '/env/teams/team2/workloadValues/.keep',
    ])
  })
})

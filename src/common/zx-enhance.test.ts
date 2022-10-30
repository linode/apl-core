import { ask, askYesNo } from 'src/common/zx-enhance'

describe('Asking a question', () => {
  const q = 'dummy question'
  const deps = {
    ask: jest.fn(),
    getParsedArgs: jest.fn(),
    question: jest.fn(),
  }
  const choices = ['aa', 'bb']
  const matching = [...choices, '']
  const defaultAnswer = 'aa'
  it('should return the default answer when no choice is made', async () => {
    deps.question.mockReturnValue('')
    expect(await ask(q, { choices, matching, defaultAnswer }, deps)).toBe(defaultAnswer)
  })
  it('should return an allowed choice', async () => {
    deps.question.mockReturnValue('aa')
    expect(await ask(q, { choices, matching, defaultAnswer }, deps)).toBe('aa')
  })

  describe('Asking a yes/no question', () => {
    it('should not care about casing', async () => {
      const options = { defaultYes: true }
      deps.ask.mockReturnValue('Yes')
      expect(await askYesNo(q, options, deps)).toBe(true)
      deps.ask.mockReturnValue('YES')
      expect(await askYesNo(q, options, deps)).toBe(true)
      deps.ask.mockReturnValue('NO')
      expect(await askYesNo(q, options, deps)).toBe(false)
      deps.ask.mockReturnValue('no')
      expect(await askYesNo(q, options, deps)).toBe(false)
    })
  })
})

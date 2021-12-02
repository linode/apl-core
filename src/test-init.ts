// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {}

export const beforeAll = (): void => {
  jest.spyOn(console, 'log').mockImplementation(noop)
  jest.spyOn(console, 'debug').mockImplementation(noop)
  jest.spyOn(console, 'info').mockImplementation(noop)
  jest.spyOn(console, 'warn').mockImplementation(noop)
  jest.spyOn(console, 'error').mockImplementation(noop)
}
export const afterAll = (): void => {
  jest.clearAllMocks()
}

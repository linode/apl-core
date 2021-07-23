import { fileURLToPath } from 'url'

export const getFilename = (path: string): string => fileURLToPath(path).split('/').pop()?.split('.')[0] as string
export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export default getFilename

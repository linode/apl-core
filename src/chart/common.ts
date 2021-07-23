import { fileURLToPath } from 'url'

export const getFilename = (path: string): string => fileURLToPath(path).split('/').pop()?.split('.')[0] as string

export default getFilename

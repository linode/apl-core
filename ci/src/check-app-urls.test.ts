import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { checkAppUrls, parseAppsYaml } from './check-app-urls'

const SINGLE_APP_YAML = `
appsInfo:
  myapp:
    title: My App
    repo: https://github.com/example/myapp
`

const MULTI_URL_YAML = `
appsInfo:
  myapp:
    title: My App
    repo: https://github.com/example/myapp
    relatedLinks:
      - https://docs.example.com
      - https://example.com/guide
  simpleapp:
    title: Simple App
    repo: https://github.com/example/simpleapp
`

describe('parseAppsYaml', () => {
  it('returns one entry for an app with only a repo url', () => {
    const results = parseAppsYaml(SINGLE_APP_YAML)
    expect(results).toEqual([{ app: 'myapp', url: 'https://github.com/example/myapp' }])
  })

  it('returns entries for repo and all relatedLinks urls', () => {
    const results = parseAppsYaml(MULTI_URL_YAML)
    expect(results).toEqual([
      { app: 'myapp', url: 'https://github.com/example/myapp' },
      { app: 'myapp', url: 'https://docs.example.com' },
      { app: 'myapp', url: 'https://example.com/guide' },
      { app: 'simpleapp', url: 'https://github.com/example/simpleapp' },
    ])
  })
})

describe('checkAppUrls', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'check-app-urls-'))
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    rmSync(tmpDir, { recursive: true })
  })

  function writeTmpYaml(content: string): string {
    const file = join(tmpDir, 'apps.yaml')
    writeFileSync(file, content)
    return file
  }

  it('marks url as ok when fetch returns status 200', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)
    const file = writeTmpYaml(SINGLE_APP_YAML)
    const results = await checkAppUrls(file)
    expect(results).toEqual([{ app: 'myapp', url: 'https://github.com/example/myapp', ok: true, status: 200 }])
  })

  it('marks url as not ok when fetch returns non-200 status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response)
    const file = writeTmpYaml(SINGLE_APP_YAML)
    const results = await checkAppUrls(file)
    expect(results).toEqual([{ app: 'myapp', url: 'https://github.com/example/myapp', ok: false, status: 404 }])
  })

  it('marks url as not ok and includes error message when fetch throws', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    const file = writeTmpYaml(SINGLE_APP_YAML)
    const results = await checkAppUrls(file)
    expect(results).toEqual([
      { app: 'myapp', url: 'https://github.com/example/myapp', ok: false, error: 'ECONNREFUSED' },
    ])
  })

  it('returns results for all urls in the file', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response)
    const file = writeTmpYaml(MULTI_URL_YAML)
    const results = await checkAppUrls(file)
    expect(results).toHaveLength(4)
    expect(results.every((r) => r.ok)).toBe(true)
  })
})

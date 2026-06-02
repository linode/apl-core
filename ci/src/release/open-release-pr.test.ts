import { buildPrBody } from './open-release-pr'

describe('buildPrBody', () => {
  it('RC body contains base checklist only', () => {
    const body = buildPrBody('1.4.0-rc.1')
    expect(body).toContain('Integration tests passed')
    expect(body).toContain('Release notes reviewed')
    expect(body).toContain('Sign-off received')
    expect(body).not.toContain('Docs updated')
    expect(body).not.toContain('Helm chart version confirmed')
    expect(body).not.toContain('Announced in #releases')
  })

  it('stable body contains base checklist plus stable-specific items', () => {
    const body = buildPrBody('1.4.0')
    expect(body).toContain('Integration tests passed')
    expect(body).toContain('Sign-off received')
    expect(body).toContain('Docs updated')
    expect(body).toContain('Helm chart version confirmed')
    expect(body).toContain('Announced in #releases')
  })

  it('body header includes the version', () => {
    expect(buildPrBody('1.4.0-rc.2')).toContain('v1.4.0-rc.2')
    expect(buildPrBody('1.4.0')).toContain('v1.4.0')
  })
})

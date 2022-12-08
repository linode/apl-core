import * as crypt from './crypt'

describe('Crypt', () => {
  it('Should provied correct list of files to be encrypted', () => {
    const allFileNames = [
      'env/secrets.a.yaml',
      'env/secrets.a.yaml.dec',
      'env/secrets.b.yaml.dec',
      'env/secrets.c.yaml',
      'env/x/y/secrets.z.yaml.dec',
      'env/teams/external-secrets.admin.yaml',
      'env/a.yaml',
      'env/b.yaml',
      'env/d.yaml',
    ]
    const r = crypt.getAllSecretFiles(allFileNames, true, '.dec')
    expect(r.sort()).toEqual(
      ['env/secrets.a.yaml.dec', 'env/secrets.b.yaml.dec', 'env/secrets.c.yaml', 'env/x/y/secrets.z.yaml.dec'].sort(),
    )
  })
  it('should be flattened', () => {
    const allFileNames = [
      'env/secrets.a.yaml',
      'env/secrets.a.yaml.dec',
      'env/secrets.b.yaml.dec',
      'env/secrets.c.yaml',
      'env/x/y/secrets.z.yaml',
      'env/a.yaml',
      'env/b.yaml',
      'secrets.d.yaml',
    ]
    const r = crypt.getAllSecretFiles(allFileNames, false, '.dec')
    expect(r.sort()).toEqual(['env/secrets.a.yaml', 'env/secrets.c.yaml', 'env/x/y/secrets.z.yaml'].sort())
  })
})

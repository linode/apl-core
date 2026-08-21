import { getSchemaSecretsPaths } from './utils'

describe('object storage credential paths', () => {
  it('should classify both halves of the linode credential as secrets', async () => {
    // Linode OBJ keys rotate as a pair, so the id has to travel the same route as its secret half:
    // into obj-secrets, out via ExternalSecret. Keeping the id in git settings forces a values-repo
    // write on every rotation just to keep the pair together.
    const secretPaths = await getSchemaSecretsPaths([])

    expect(secretPaths).toContain('obj.provider.linode.accessKeyId')
    expect(secretPaths).toContain('obj.provider.linode.secretAccessKey')
  })
})

import { V1ObjectMeta, V1Secret } from '@kubernetes/client-node'
import { expect } from 'chai'
import { targetTlsSecretsFilter } from './copy-certs'

const teamIds = ['dev', 'demo']
const secretDataBla = {
  secret: 'bla',
}
const secretDataDida = {
  secret: 'dida',
}
const secretBla = {
  ...new V1Secret(),
  data: secretDataBla,
  metadata: {
    ...new V1ObjectMeta(),
    annotations: {
      'app.kubernetes.io/managed-by': 'otomi',
    },
    name: 'copy-dev-bla',
  },
}
const secretDida = {
  ...new V1Secret(),
  data: secretDataDida,
  metadata: {
    ...new V1ObjectMeta(),
    annotations: {
      'app.kubernetes.io/managed-by': 'otomi',
    },
    name: 'copy-demo-dida',
  },
}
const secretNo = {
  ...new V1Secret(),
  data: secretDataDida,
  metadata: {
    ...new V1ObjectMeta(),
    name: 'nomatch',
  },
}

const targetTlsSecretsFiltered = [secretBla, secretDida]
const targetTlsSecrets = [secretBla, secretDida, secretNo]

describe('Task: copy certs', () => {
  it('targetTlsSecretsFilter should filter copyied secrets', () => {
    expect(targetTlsSecrets.filter(targetTlsSecretsFilter)).to.deep.equal(targetTlsSecretsFiltered)
  })
})

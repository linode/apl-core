import { cloneDeep, merge } from 'lodash'
import { pki } from 'node-forge'
import { createMock } from 'ts-auto-mock'
import stubs from '../test-stubs'
import {
  bootstrapValues,
  copyBasicFiles,
  createCustomCA,
  generateLooseSchema,
  getStoredClusterSecrets,
  processValues,
} from './bootstrap'

const { terminal } = stubs

describe('Bootstrapping values', () => {
  const values = {
    charts: { 'cert-manager': { issuer: 'custom-ca' } },
    cluster: { name: 'bla', provider: 'dida' },
  }
  const secrets = { secret: 'true', deep: { nested: 'secret' } }
  let deps
  beforeEach(() => {
    deps = {
      existsSync: jest.fn(),
      getImageTag: jest.fn(),
      terminal,
      copyBasicFiles: jest.fn(),
      processValues: jest.fn(),
      hfValues: jest.fn(),
      createCustomCA: jest.fn(),
      isCli: true,
      writeValues: jest.fn(),
      genSops: jest.fn(),
      copyFile: jest.fn(),
      getK8sSecret: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    }
  })
  it('should copy only skeleton files to env dir if it is empty or nonexisting', async () => {
    deps.processValues.mockReturnValue(undefined)
    await bootstrapValues(deps)
    expect(deps.getImageTag).toHaveBeenCalledWith(true)
    expect(deps.hfValues).toHaveBeenCalledTimes(0)
  })
  it('should get stored cluster secrets if those exist', async () => {
    deps.getK8sSecret.mockReturnValue(secrets)
    const res = await getStoredClusterSecrets(deps)
    expect(res).toEqual(secrets)
  })
  it('should not get stored cluster secrets if those do not exist', async () => {
    deps.getK8sSecret.mockReturnValue(undefined)
    const res = await getStoredClusterSecrets(deps)
    expect(res).toEqual(undefined)
  })
  it('should set apiName, k8sContext and owner if needed', async () => {
    deps.processValues.mockReturnValue(values)
    deps.hfValues.mockReturnValue(values)
    await bootstrapValues(deps)
    expect(deps.writeValues).toHaveBeenCalledWith(
      expect.objectContaining({
        cluster: expect.objectContaining({
          apiName: expect.any(String),
          k8sContext: expect.any(String),
          owner: expect.any(String),
        }),
      }),
      true,
    )
  })
  it('should copy sops related files if needed', async () => {
    deps.processValues.mockReturnValue(values)
    deps.hfValues.mockReturnValue(values)
    deps.existsSync.mockReturnValue(true)
    await bootstrapValues(deps)
    expect(deps.copyFile).toHaveBeenCalled()
    expect(deps.encrypt).toHaveBeenCalled()
    expect(deps.decrypt).toHaveBeenCalled()
  })
  describe('Generating a loose schema', () => {
    const values = { test: 'ok', required: 'remove', nested: { required: 'remove-leaf' } }
    const rootDir = '/bla'
    const targetPath = `${rootDir}/.vscode/values-schema.yaml`
    const deps = {
      isCore: true,
      rootDir,
      loadYaml: jest.fn().mockReturnValue(values),
      env: () => ({
        ENV_DIR: '/bla/env',
      }),
      terminal,
      outputFileSync: jest.fn(),
    }
    it('should create a schema without required props', () => {
      generateLooseSchema(deps)
      expect(deps.outputFileSync).toHaveBeenCalledWith(targetPath, 'test: ok\n')
    })
  })
  describe('Copying basic files', () => {
    const deps = {
      env: () => ({
        ENV_DIR: '/bla/env',
      }),
      mkdirSync: jest.fn(),
      copyFile: jest.fn(),
      terminal,
      copy: jest.fn(),
      generateLooseSchema: jest.fn(),
      existsSync: jest.fn(),
    }
    it('should not throw any exception', async () => {
      const res = await copyBasicFiles(deps)
      expect(res).toBe(undefined)
    })
  })
  describe('Checking for a custom CA', () => {
    const deps = {
      pki: createMock<typeof pki>(),
      writeValues: jest.fn(),
      terminal,
    }
    deps.pki.certificateToPem = jest.fn().mockReturnValue('certpem')
    deps.pki.privateKeyToPem = jest.fn().mockReturnValue('keypem')
    it('should create a new key pair when none exist', () => {
      const res = createCustomCA(deps)
      expect(res).toMatchObject({
        charts: {
          'cert-manager': {
            customRootCA: 'certpem',
            customRootCAKey: 'keypem',
          },
        },
      })
    })
  })
  describe('processing values', () => {
    const generatedSecrets = { gen: 'x' }
    const ca = { a: 'cert' }
    const mergedValues = merge(cloneDeep(values), cloneDeep(secrets))
    const mergedSecrets = merge(cloneDeep(generatedSecrets), cloneDeep(ca), cloneDeep(secrets))
    let deps
    beforeEach(() => {
      deps = {
        terminal,
        isChart: true,
        loadYaml: jest.fn(),
        decrypt: jest.fn(),
        getStoredClusterSecrets: jest.fn().mockReturnValue(secrets),
        writeValues: jest.fn(),
        env: () => ({
          ENV_DIR: '/tmp/otomi-test/env',
        }),
        createK8sSecret: jest.fn(),
        createCustomCA: jest.fn().mockReturnValue(ca),
        hfValues: jest.fn().mockReturnValue(values),
        existsSync: jest.fn(),
        validateValues: jest.fn().mockReturnValue(true),
        generateSecrets: jest.fn().mockReturnValue(generatedSecrets),
      }
    })
    describe('Creating CA', () => {
      it('should ask to create a CA if issuer is custom-ca', async () => {
        await processValues(deps)
        expect(deps.createCustomCA).toHaveBeenCalledTimes(1)
      })
      it('should not ask to create a CA if issuer is not custom-ca', async () => {
        deps.loadYaml.mockReturnValue(merge(cloneDeep(values), { charts: { 'cert-manager': { issuer: 'nono' } } }))
        await processValues(deps)
        expect(deps.createCustomCA).toHaveBeenCalledTimes(0)
      })
    })
    describe('processing chart values', () => {
      it('should not retrieve values from env dir', async () => {
        await processValues(deps)
        expect(deps.hfValues).toHaveBeenCalledTimes(0)
      })
      it('should generate secrets by taking values and previously generated secrets as input', async () => {
        deps.loadYaml.mockReturnValue(values)
        await processValues(deps)
        expect(deps.generateSecrets).toHaveBeenCalledWith(merge(cloneDeep(secrets), cloneDeep(values)))
        expect(deps.createK8sSecret).toHaveBeenCalledTimes(1)
      })
      it('should create a secret with passwords if no such secret exists', async () => {
        const existingSecret = { secret: 'exists' }
        const valuesWithSecrets = merge(cloneDeep(values), existingSecret)
        const allSecrets = merge(cloneDeep(mergedSecrets), existingSecret)
        deps.loadYaml.mockReturnValue(valuesWithSecrets)
        deps.getStoredClusterSecrets.mockReturnValue(merge(cloneDeep(secrets), { secret: 'stale' }))
        deps.generateSecrets.mockReturnValue(allSecrets)
        await processValues(deps)
        expect(deps.generateSecrets).toHaveBeenCalledWith(merge(cloneDeep(secrets), cloneDeep(valuesWithSecrets)))
        expect(deps.createK8sSecret).toHaveBeenCalledWith('otomi-generated-passwords', 'default', allSecrets)
        expect(deps.createK8sSecret).toHaveBeenCalledTimes(1)
      })
      it('should create a custom ca if issuer is custom-ca or undefined and no CA yet exists', async () => {
        deps.loadYaml.mockReturnValue({ charts: { 'cert-manager': { issuer: 'custom-ca' } } })
        await processValues(deps)
        expect(deps.createCustomCA).toHaveBeenCalled()
      })
      it('should not re-create a custom ca if issuer is custom-ca or undefined and a CA already exists', async () => {
        deps.loadYaml.mockReturnValue({
          charts: { 'cert-manager': { issuer: 'custom-ca', customRootCA: 'certpem', customRootCAKey: 'keypem' } },
        })
        await processValues(deps)
        expect(deps.createCustomCA).toHaveBeenCalledTimes(0)
      })
      it('should only store secrets', async () => {
        deps.getStoredClusterSecrets.mockReturnValue(secrets)
        deps.generateSecrets.mockReturnValue(generatedSecrets)
        deps.createCustomCA.mockReturnValue(ca)
        await processValues(deps)
        expect(deps.createK8sSecret).toHaveBeenCalledWith('otomi-generated-passwords', 'default', mergedSecrets)
      })
      it('should only write and return original values', async () => {
        const writtenValues = merge(cloneDeep(values), cloneDeep(secrets))
        deps.loadYaml.mockReturnValue(values)
        deps.getStoredClusterSecrets.mockReturnValue(secrets)
        deps.generateSecrets.mockReturnValue(generatedSecrets)
        deps.createCustomCA.mockReturnValue(ca)
        const res = await processValues(deps)
        expect(deps.writeValues).toHaveBeenNthCalledWith(1, writtenValues, true)
        expect(res).toEqual(mergedValues)
      })
      it('should merge original with generated values and write them to env dir', async () => {
        const writtenValues = merge(cloneDeep(values), cloneDeep(mergedSecrets))
        deps.loadYaml.mockReturnValue(values)
        deps.getStoredClusterSecrets.mockReturnValue(secrets)
        deps.generateSecrets.mockReturnValue(generatedSecrets)
        await processValues(deps)
        expect(deps.writeValues).toHaveBeenNthCalledWith(2, writtenValues, false)
      })
    })
    describe('processing env dir values', () => {
      beforeEach(() => {
        deps.isChart = false
      })
      it('should retrieve previous user input when cluster provider is set', async () => {
        deps.loadYaml.mockReturnValue({ ...values, cluster: { provider: 'set' } })
        await processValues(deps)
        expect(deps.hfValues).toHaveBeenCalledWith({ filesOnly: true })
      })
      it('should not validate values when starting empty', async () => {
        deps.hfValues.mockReturnValue(undefined)
        await processValues(deps)
        expect(deps.validateValues).toHaveBeenCalledTimes(0)
      })
      it('should validate values when values were found', async () => {
        deps.existsSync.mockReturnValue(true)
        deps.loadYaml.mockReturnValue({ cluster: { provider: 'chek' } })
        deps.hfValues.mockReturnValue(values)
        await processValues(deps)
        expect(deps.validateValues).toHaveBeenCalledTimes(1)
      })
      it('should generate secrets by taking previous values as input', async () => {
        deps.hfValues.mockReturnValue(values)
        deps.loadYaml.mockReturnValue(values)
        deps.generateSecrets.mockReturnValue(generatedSecrets)
        await processValues(deps)
        expect(deps.generateSecrets).toHaveBeenCalledWith(cloneDeep(values))
      })
    })
  })
})

import { merge } from 'lodash'
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
  const secrets = { secret: 'true', some: { nested: 'secret' } }
  let deps
  beforeEach(() => {
    deps = {
      existsSync: jest.fn(),
      getImageTag: jest.fn(),
      debug: terminal(),
      copyBasicFiles: jest.fn(),
      processValues: jest.fn().mockReturnValue(values),
      hfValues: jest.fn().mockReturnValue(values),
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
  it('should copy only skeleton files to ENV_DIR if it is empty or nonexisting', async () => {
    deps.processValues.mockReturnValue(undefined)
    await bootstrapValues(deps)
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
  it('should set k8sContext if needed', async () => {
    await bootstrapValues(deps)
    expect(deps.writeValues).toHaveBeenCalledWith(
      expect.objectContaining({
        cluster: { k8sContext: `otomi-${values.cluster.provider}-${values.cluster.name}` },
      }),
      true,
    )
  })
  it('should copy sops related files if needed', async () => {
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
      debug: terminal(),
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
      debug: terminal(),
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
    it('should create a new key pair when none exist', async () => {
      const values = {}
      await createCustomCA(values, deps)
      expect(deps.writeValues).toHaveBeenCalledWith(
        {
          charts: {
            'cert-manager': {
              customRootCA: 'certpem',
              customRootCAKey: 'keypem',
            },
          },
        },
        true,
      )
    })
    it('should not create a new key pair when those already exist', async () => {
      deps.writeValues.mockReset()
      const values = {
        charts: { 'cert-manager': { customRootCA: 'customRootCA', customRootCAKey: 'customRootCAKey' } },
      }
      await createCustomCA(values, deps)
      expect(deps.writeValues).toHaveBeenCalledTimes(0)
    })
  })
  describe('processing values', () => {
    const mergedValues = merge(values, secrets)
    let deps
    beforeEach(() => {
      deps = {
        debug: terminal(),
        isChart: true,
        loadYaml: jest.fn().mockReturnValue(values),
        getStoredClusterSecrets: jest.fn(),
        writeValues: jest.fn(),
        env: () => ({
          ENV_DIR: '/tmp/otomi-test/env',
        }),
        createK8sSecret: jest.fn(),
        createCustomCA: jest.fn(),
        hfValues: jest.fn().mockReturnValue(values),
        existsSync: jest.fn(),
        validateValues: jest.fn().mockReturnValue(true),
        generateSecrets: jest.fn(),
      }
    })
    describe('Creating CA', () => {
      it('should ask to create a CA if issuer is custom-ca', async () => {
        await processValues(deps)
        expect(deps.createCustomCA).toHaveBeenCalledTimes(1)
      })
      it('should not ask to create a CA if issuer is not custom-ca', async () => {
        deps.loadYaml.mockReturnValue(merge(values, { charts: { 'cert-manager': { issuer: 'nono' } } }))
        await processValues(deps)
        expect(deps.createCustomCA).toHaveBeenCalledTimes(0)
      })
    })
    describe('processing chart values', () => {
      it('should create a secret with passwords if no such secret exists', async () => {
        await processValues(deps)
        expect(deps.writeValues).toHaveBeenNthCalledWith(1, values, true)
        expect(deps.generateSecrets).toHaveBeenCalledWith(values)
        expect(deps.createK8sSecret).toHaveBeenCalledTimes(1)
      })
      it('should not re-generate passwords if already existing in secrets', async () => {
        deps.getStoredClusterSecrets.mockReturnValue(secrets)
        const res = await processValues(deps)
        expect(deps.writeValues).toHaveBeenNthCalledWith(1, mergedValues, true)
        expect(deps.createK8sSecret).toHaveBeenCalledTimes(1)
        expect(res).toEqual(mergedValues)
      })
    })
    describe('processing ENV_DIR values', () => {
      beforeEach(() => {
        deps.isChart = false
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
    })
  })
})

import { terminal } from 'src/common/debug'
import { getFilename } from 'src/common/utils'
import { BasicArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { supportedK8sVersions } from 'src/supportedK8sVersions.json'
import { Argv } from 'yargs'
import { k8s } from '../common/k8s'

const cmdName = getFilename(__filename)

export const validateCluster = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:validateCluster`)
  d.info('Cluster validation STARTED')
  try {
    const versionInfo = await k8s.version().getCode()
    const k8sVersion = `${versionInfo.major}.${versionInfo.minor}`
    d.info(`Cluster Kubernetes version: ${k8sVersion}`)
    if (!supportedK8sVersions.includes(k8sVersion)) {
      const k8sVersions = supportedK8sVersions.join(', ')
      d.error(
        `The cluster utilizes Kubernetes version ${k8sVersion} which is potentially incompatible with App Platform. For optimal performance and features, we recommend using one of our supported versions: [${k8sVersions}].`,
      )
    } else {
      d.info('Cluster validation SUCCESS')
    }
  } catch (e) {
    d.warn(e)
    d.warn('Could not validate cluster kubernetes version. Assuming that it is compatible. Proceeding.')
  }
}

export const module = {
  command: cmdName,
  describe: 'Validate cluster against supported k8s versions',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await validateCluster()
  },
}

import { terminal } from 'src/common/debug'
import { getFilename } from 'src/common/utils'
import { BasicArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { supportedK8sVersions } from 'src/supportedK8sVersions.json'
import { Argv } from 'yargs'
import { k8s } from '../common/k8s'

const cmdName = getFilename(__filename)

export const validateCluster = async (): Promise<boolean> => {
  const d = terminal(`cmd:${cmdName}:validateCluster`)
  try {
    const versionInfo = await k8s.version().getCode()
    // For removing any common suffixes from the minor version, e.g. 32+
    const minorVersion = Number.parseInt(versionInfo.minor)
    const k8sVersion = !Number.isNaN(minorVersion) ? `${versionInfo.major}.${minorVersion}` : versionInfo.major
    d.info(`Cluster Kubernetes version: ${k8sVersion}`)
    if (!supportedK8sVersions.includes(k8sVersion)) {
      const k8sVersions = supportedK8sVersions.join(', ')
      d.error(
        `The cluster utilizes Kubernetes version ${k8sVersion} which is potentially incompatible with App Platform. For optimal performance and features, we recommend using one of our supported versions: [${k8sVersions}].`,
      )
      return false
    }
  } catch (e) {
    d.warn(e)
    d.warn('Could not validate cluster Kubernetes version. Assuming that it is compatible. Proceeding.')
  }
  return true
}

export const module = {
  command: cmdName,
  describe: 'Validate cluster against supported k8s versions',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    if (!(await validateCluster())) {
      process.exit(1)
    }
  },
}

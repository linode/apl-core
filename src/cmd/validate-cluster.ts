import { terminal } from 'src/common/debug'
import { getFilename } from 'src/common/utils'
import { BasicArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { supportedK8sVersions } from 'src/supportedK8sVersions.json'
import { Argv } from 'yargs'
import { $ } from 'zx'

const cmdName = getFilename(__filename)

export const validateCluster = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:validateCluster`)
  d.log('Cluster validation STARTED')
  try {
    const result = await $`kubectl version -o json`
    const data = JSON.parse(result.stdout)
    const k8sVersion: string = data.serverVersion.gitVersion.slice(1, 5)
    if (!supportedK8sVersions.includes(k8sVersion)) {
      const k8sVersions = supportedK8sVersions.join(', ')
      d.error(
        `The cluster with kubernetes version ${k8sVersion} is utilizing a less compatible version for otomi. For optimal performance and features, we recommend using one of our supported versions: [${k8sVersions}]. Make sure to align your cluster with these versions to take full advantage of our services.`,
      )
      process.exit(1)
    } else d.log('Cluster validation SUCCESS')
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

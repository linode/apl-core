import { terminal } from 'src/common/debug'
import { getFilename } from 'src/common/utils'
import { BasicArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { supportedK8sVersions } from 'src/supportedK8sVersions.json'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'

const cmdName = getFilename(__filename)

export const validateCluster = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:validateCluster`)
  d.log('Validate cluster STARTED')
  const result = await nothrow($`kubectl version -o json`)
  const data = JSON.parse(result.stdout)
  d.log('data', data)
  const k8sVersion: string = data.serverVersion.gitVersion.slice(1, 5)
  d.log(`Cluster k8sVersion is ${k8sVersion}`)
  if (!supportedK8sVersions.includes(k8sVersion)) {
    d.error(`Cluster k8sVersion ${k8sVersion} is not supported!`)
    process.exit(1)
  } else d.log('Validate cluster SUCCESS')
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

import { existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { terminal } from 'src/common/debug'
import { hf } from 'src/common/hf'
import { getFilename, rootDir } from 'src/common/utils'
import { ProcessOutputTrimmed } from 'src/common/zx-enhance'
import { CommandModule } from 'yargs'
import { $ } from 'zx/core'

const cmdName = getFilename(__filename)
const dir = '/tmp/apl-operator/'
const templateFile = `${dir}deploy-template.yaml`
const d = terminal(`cmd:${cmdName}:apply-teams`)

export const applyTeams = async (): Promise<boolean> => {
  // Debug current working directory and file structure
  d.info(`Current working directory: ${process.cwd()}`)

  // The helmfile templates are in the main apl-core repo, not the values repo
  // We need to find the path to the main apl-core repository
  const aplCoreDir = rootDir || resolve(process.cwd(), '../apl-core')
  const helmfileSource = resolve(aplCoreDir, 'helmfile.tpl/helmfile-teams.yaml.gotmpl')

  if (!existsSync(helmfileSource)) {
    throw new Error(`Helmfile teams template not found at: ${helmfileSource}`)
  }

  d.info(`Parsing team namespaces defined in ${helmfileSource}`)

  const output: ProcessOutputTrimmed = await hf(
    { fileOpts: helmfileSource, args: 'template' },
    { streams: { stderr: d.stream.error } },
  )
  if (output.exitCode > 0) {
    throw new Error(output.stderr)
  } else if (output.stderr.length > 0) {
    d.error(output.stderr)
  }
  const templateOutput = output.stdout
  writeFileSync(templateFile, templateOutput)
  await $`kubectl apply -f ${templateFile}`

  d.info('Teams applied')
  return true
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Apply all',

  handler: async (): Promise<void> => {
    await applyTeams()
  },
}

/* eslint-disable import/namespace */
import { Argv, Options } from 'yargs'
import { hfValues } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import { BasicArguments, getFilename, getParsedArgs, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import * as tasks from '../tasks'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

const taskOpts: { [key: string]: Options } = {
  label: {
    alias: ['n', 'name'],
    describe: 'Name of the task to run',
    nargs: 1,
  },
}
Object.keys(taskOpts).map((k) => {
  taskOpts[k].group = 'Task options'
  return k
})
const taskOptions = (parser: Argv): Argv => {
  return parser.options(taskOpts)
}

interface Arguments extends BasicArguments {
  task: string
}

export const runTask = async (): Promise<void> => {
  const args = getParsedArgs() as Arguments
  const name = args.name as string
  debug.info(`Starting task: ${name}`)
  if (!tasks[name]) throw new Error(`No such task exists: ${name}`)
  const values = (await hfValues()) as Record<string, any>
  return tasks[name](values)
}

export const module = {
  command: cmdName,
  describe: 'Uses helmfile lint to lint the target manifests',
  builder: (parser: Argv): Argv => taskOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    return runTask()
  },
}

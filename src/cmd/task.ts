/* eslint-disable import/namespace */
import { Argv, Options } from 'yargs'
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

export const runTask = async (inName?: string): Promise<void> => {
  const args = getParsedArgs() as Arguments
  const name = inName ?? (args.name as string)
  debug.info(`Starting task: ${name}`)
  const task = tasks[name]
  if (!task) throw new Error(`No such task exists: ${name}`)
  await task()
}

export const module = {
  command: cmdName,
  describe: 'Runs a task from the tasks folder',
  builder: (parser: Argv): Argv => taskOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    return runTask()
  },
}

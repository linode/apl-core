import { existsSync } from 'fs'
import { Argv, Options } from 'yargs'
import { chalk } from 'zx'
import { BasicArguments, logLevels } from './utils'

export interface Arguments extends BasicArguments {
  label?: string[]
  selector?: string[]
  l?: string[]
  file?: string[]
  f?: string[]
}

const helmOpts: { [key: string]: Options } = {
  label: {
    alias: ['l', 'selector'],
    array: true,
    describe:
      "Select charts by label (format: <label>=<value>), e.g. '-l name=prometheus-operator' or '--label group=jobs'",
    nargs: 1,
    coerce: (labels: string[]) => {
      if (!labels || labels.length === 0) return labels
      labels.filter((val) => {
        if (!/\w+!?=\w+/.exec(val)) throw new Error(`Expected label in form k=v or k!=v, got "${chalk.italic(val)}"`)
        return true
      })
      return labels
    },
  },
  file: {
    alias: 'f',
    array: true,
    describe: "Select helmfiles by filename, e.g. '-f helmfile.d/helmfile-15.ingress-core.yaml'",
    nargs: 1,
    coerce: (files: string[]) => {
      if (!files || files.length === 0) return files
      files.filter((val) => {
        if (!existsSync(val)) throw new Error(`Expected file "${chalk.italic(val)}" does not exists.`)
        return true
      })
      return files
    },
  },
  // TODO: These options are defined, but not yet implemented!
  // 'helm-binary': {
  //   alias: 'b',
  //   string: true,
  //   default: 'helm',
  //   describe: 'Path to the helm binary',
  // },
  // environment: {
  //   alias: 'e',
  //   string: true,
  //   default: 'default',
  //   describe: 'Specify the environment name',
  // },
  // quiet: {
  //   alias: 'q',
  //   boolean: true,
  // },
  // 'state-value-set': {
  //   string: true,
  //   describe:
  //     'set state values on the command line (can specify multiple or separate values with commas: key1=val1,key2=val2)',
  //   coerce: (set: string) => {
  //     if (!set || set.length === 0) return set
  //     set.split(',').filter((val) => {
  //       if (!/\w+!?=\w+/.exec(val))
  //         throw new Error(`Expected set in form key1=val1 or key1=val1,key2=val2, got "${chalk.italic(set)}"`)
  //       return true
  //     })
  //     return set
  //   },
  // },
  // 'state-values-file': {
  //   string: true,
  //   describe: 'specify state values in a YAML file',
  //   coerce: (file: string) => {
  //     if (!file || file.length === 0) return file
  //     if (existsSync(file)) return file
  //     throw new Error(`State values file expected, but ${file} does not exists`)
  //   },
  // },
  // 'kube-context': {
  //   string: true,
  //   describe: 'Set kubectl context. Uses current context by default',
  //   default: process.env.K8S_CONTEXT, // Possibly empty if assuming the sourcing of env files from $env.ENV_DIR
  // },
}
Object.keys(helmOpts).map((k) => {
  helmOpts[k].group = 'Helmfile Options'
  return k
})

export const basicOptions: { [key: string]: Options } = {
  'log-level': {
    choices: Object.entries(logLevels)
      .filter((val) => Number.isNaN(Number(val[0])))
      .map((val) => val[0].toLowerCase()),
    default: logLevels[logLevels.WARN].toLowerCase(),
    coerce: (val) => val.toLowerCase(),
  },
  'skip-cleanup': {
    alias: 's',
    boolean: true,
    default: false,
  },
  'set-context': {
    alias: 'c',
    boolean: true,
    default: false,
  },
  verbose: {
    alias: 'v',
    count: true,
    coerce: (val: number) =>
      Math.min(
        val,
        Object.keys(logLevels)
          .filter((logLevelVal) => !Number.isNaN(Number(logLevelVal)))
          .map(Number)
          .reduce((prev, curr) => Math.max(prev, curr)),
      ),
  },
  'non-interactive': {
    alias: 'ni',
    boolean: true,
    default: false,
  },
  trace: {
    boolean: true,
    default: false,
    hidden: true,
  },
  dev: {
    boolean: true,
    default: false,
    hidden: true,
  },
  inDocker: {
    boolean: true,
    default: false,
    hidden: true,
  },
}

export const helmOptions = (parser: Argv): Argv => parser.options(helmOpts)

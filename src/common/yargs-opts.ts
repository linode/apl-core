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
        if (!existsSync(val)) throw new Error(`Expected file "${chalk.italic(val)}" does not exist.`)
        return true
      })
      return files
    },
  },
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
    coerce: (val: number) => {
      const ll = Object.keys(logLevels)
        .filter((logLevelVal) => !Number.isNaN(Number(logLevelVal)))
        .map(Number)
        .reduce((prev, curr) => Math.max(prev, curr))
      return Math.min(Math.max(val, Number(process.env.VERBOSITY || '0')), ll)
    },
  },
  'non-interactive': {
    alias: 'ni',
    boolean: true,
    default: false,
  },
  debug: {
    alias: 'd',
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
}

export const helmOptions = (parser: Argv): Argv => parser.options(helmOpts)

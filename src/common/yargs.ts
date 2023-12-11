import { existsSync } from 'fs'
import { logLevel, logLevels } from 'src/common/debug'
import { env } from 'src/common/envalid'
import yargs, { Arguments as YargsArguments, Argv, Options } from 'yargs'
import { chalk } from 'zx'

export interface BasicArguments extends YargsArguments {
  logLevel?: string
  nonInteractive?: boolean
  skipCleanup?: boolean
  trace?: boolean
  verbose?: number
  debug?: boolean
}

export interface HelmArguments extends BasicArguments {
  args?: string
  a?: string
  kubeVersion?: string
  k?: string
  label?: string[]
  l?: string[]
  file?: string[]
  f?: string[]
}

let parsedArgs: BasicArguments

export const parser: any = yargs(process.argv.slice(3))

export const setParsedArgs = (args: BasicArguments): void => {
  parsedArgs = args
  // Call needed to init LL for debugger and ZX calls:
  logLevel(parsedArgs)
}
export const getParsedArgs = (): BasicArguments => {
  return parsedArgs || {}
}

const helmOpts: { [key: string]: Options } = {
  label: {
    alias: ['l'],
    array: true,
    describe:
      "Select charts by label (format: <label>=<value>), e.g. '-l name=prometheus-operator' or '--label group=jobs'",
    nargs: 1,
    coerce: (labels: string[]) => {
      if (!labels || labels.length === 0) return labels
      labels.forEach((val) => {
        if (!/\w+!?=\w+/.exec(val)) throw new Error(`Expected label in form k=v or k!=v, got "${chalk.italic(val)}"`)
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
      files.forEach((val) => {
        if (!existsSync(val)) throw new Error(`Expected file "${chalk.italic(val)}" does not exist.`)
      })
      return files
    },
  },
  'kube-version': {
    alias: 'k',
    type: 'string',
  },
  args: {
    alias: 'a',
    array: true,
    describe: "Pass arguments to the helmfile command, e.g. '--set somevar=val,another=ok'",
  },
}
Object.keys(helmOpts).map((k) => {
  helmOpts[k].group = 'Helmfile options'
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
      return Math.min(Math.max(val, Number(env.VERBOSITY || '0')), ll)
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

export const helmOptions = (p: Argv): Argv => p.options(helmOpts)

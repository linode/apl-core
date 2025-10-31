// This stub is used for testing purposes only.
// Jest would try to load the actual yargs module.
// Which fails because its esm module and Jest is not configured to handle esm modules.
import type { Argv } from 'yargs'

function makeStub(): any {
  const stub: any = {
    command: (..._args: any[]) => stub,
    option: (..._args: any[]) => stub,
    options: (..._args: any[]) => stub,
    help: (..._args: any[]) => stub,
    version: (..._args: any[]) => stub,
    parse: (..._args: any[]) => ({}),
    parseSync: (..._args: any[]) => ({}),
    parseAsync: (..._args: any[]) => Promise.resolve({}),
    demandOption: (..._args: any[]) => stub,
    demandCommand: (..._args: any[]) => stub,
    middleware: (..._args: any[]) => stub,
    strict: (..._args: any[]) => stub,
    strictCommands: (..._args: any[]) => stub,
    wrap: (..._args: any[]) => stub,
    fail: (..._args: any[]) => stub,
    showHelpOnFail: (..._args: any[]) => stub,
    alias: (..._args: any[]) => stub,
    argv: {},
    check: (..._args: any[]) => stub,
    scriptName: (..._args: any[]) => stub,
    epilogue: (..._args: any[]) => stub,
    epilog: (..._args: any[]) => stub,
    usage: (..._args: any[]) => stub,
    example: (..._args: any[]) => stub,
    positional: (..._args: any[]) => stub,
    group: (..._args: any[]) => stub,
    hide: (..._args: any[]) => stub,
    env: (..._args: any[]) => stub,
    config: (..._args: any[]) => stub,
    pkgConf: (..._args: any[]) => stub,
    showHidden: (..._args: any[]) => stub,
    recommendCommands: (..._args: any[]) => stub,
  }
  return stub
}

export default function yargs(_argv?: string[] | ReadonlyArray<string> | null): Argv {
  return makeStub() as Argv
}

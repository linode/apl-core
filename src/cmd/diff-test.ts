import { compare } from 'dir-compare'
import { ensureDir, move, readFile, rm, writeFile } from 'fs-extra'
import { prepareEnvironment } from 'src/common/cli'
import { hfTemplate } from 'src/common/hf'
import { getFilename, manifestExplodeToDir, rootDir } from 'src/common/utils'
import { getParsedArgs, helmOptions, setParsedArgs } from 'src/common/yargs'
import { ask } from 'src/common/zx-enhance'
import { Arguments, Argv } from 'yargs'

const cmdName = getFilename(__filename)

const snapshotFile = `${rootDir}/tests/snapshots/template.yaml`
const snapshotFileNext = `${rootDir}/tests/snapshots/template-next.yaml`
const snapshotDir = `${rootDir}/tests/snapshots/template`
const snapshotDirNext = `${rootDir}/tests/snapshots/template-next`

const diffTest = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  await rm(snapshotDir, { force: true, recursive: true })
  await rm(snapshotDirNext, { force: true, recursive: true })
  await ensureDir(snapshotDir)
  await ensureDir(snapshotDirNext)
  const prevOutput = await readFile(snapshotFile, 'utf8')
  const prev = prevOutput.split(/---\n/)
  await manifestExplodeToDir(prev, snapshotDir)
  const nextTemplate = (await hfTemplate(argv, undefined, undefined, `${rootDir}/tests/fixtures`))
    // remove uuidv4 generated ids, comments and extraneous newlines
    .replace(/-[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/g, '')
    .replace(/^#.*/gm, '')
    .replace(/^[ ]+#.*/gm, '')
    .replace(/[ ]{1}#.*/g, '')
    .replace(/[\n]+/g, '\n')
  await writeFile(snapshotFileNext, nextTemplate)
  const next = nextTemplate.split(/---\n/)
  await manifestExplodeToDir(next, snapshotDirNext)
  const diff = await compare(snapshotDir, snapshotDirNext)
  if (diff.same) return console.log('No diff found')
  // const res = await nothrow($`diff -r ${snapshotDir} ${snapshotDirNext}`)
  // console.log(res)
  // if (res.exitCode === 0) return console.log('No diff found')
  if (!argv.nonInteractive) {
    const q =
      'Diff found. Open the compare tool with CMD-LL to see if the changes are expected. If so confirm with y or n.'
    const choices = ['y', 'n']
    const matching = [...choices]
    const defaultAnswer = 'n'
    const answer = await ask(q, { choices, matching, defaultAnswer })
    if (answer === 'y') {
      await move(snapshotFileNext, snapshotFile, { overwrite: true })
      console.log('Updated snapshot file.')
      return
    } else console.log('Aborted!')
  }
  process.exit(1)
}

export const module = {
  command: cmdName,
  describe: 'Diffs templates generated from tests/fixtures',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await diffTest()
  },
}

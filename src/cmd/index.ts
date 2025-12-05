import { CommandModule } from 'yargs'
import { module as applyModule } from './apply'
import { module as applyAsAppsModule } from './apply-as-apps'
import { module as applyTeamsModule } from './apply-teams'
import { module as bashModule } from './bash'
import { module as bootstrapModule } from './bootstrap'
import { module as collectModule } from './collect'
import { module as commitModule } from './commit'
import { module as decryptModule } from './decrypt'
import { module as destroyModule } from './destroy'
import { module as diffModule } from './diff'
import { module as encryptModule } from './encrypt'
import { module as filesModule } from './files'
import { module as hfModule } from './hf'
import { module as installModule } from './install'
import { module as lintModule } from './lint'
import { module as migrateModule } from './migrate'
import { module as playgroundModule } from './playground'
import { module as pullModule } from './pull'
import { module as scoreTemplatesModule } from './score-templates'
import { module as serverModule } from './server'
import { module as statusModule } from './status'
import { module as syncModule } from './sync'
import { module as templateModule } from './template'
import { module as testModule } from './test'
import { module as validateClusterModule } from './validate-cluster'
import { module as validateTemplatesModule } from './validate-templates'
import { module as validateValuesModule } from './validate-values'
import { module as valuesModule } from './values'
import { module as xModule } from './x'

export { module as apply } from './apply'
export { module as applyAsAppsModule } from './apply-as-apps'
export { module as applyTeams } from './apply-teams'
export { module as bash } from './bash'
export { module as bootstrap } from './bootstrap'
export { module as collect } from './collect'
export { module as commit } from './commit'
export { module as decrypt } from './decrypt'
export { module as destroy } from './destroy'
export { module as diff } from './diff'
export { module as encrypt } from './encrypt'
export { module as files } from './files'
export { module as hf } from './hf'
export { module as install } from './install'
export { module as lint } from './lint'
export { module as migrate } from './migrate'
export { module as pull } from './pull'
export { module as scoreTemplates } from './score-templates'
export { module as server } from './server'
export { module as status } from './status'
export { module as sync } from './sync'
export { module as template } from './template'
export { module as test } from './test'
export { module as traces } from './traces'
export { module as validateTemplates } from './validate-templates'
export { module as validateValues } from './validate-values'
export { module as values } from './values'
export { module as x } from './x'

export const commands: CommandModule[] = [
  applyModule,
  applyAsAppsModule,
  applyTeamsModule,
  bashModule,
  bootstrapModule,
  commitModule,
  decryptModule,
  destroyModule,
  diffModule,
  encryptModule,
  filesModule,
  hfModule,
  installModule,
  lintModule,
  migrateModule,
  playgroundModule,
  pullModule,
  scoreTemplatesModule,
  serverModule,
  statusModule,
  syncModule,
  templateModule,
  testModule,
  collectModule,
  validateClusterModule,
  validateTemplatesModule,
  validateValuesModule,
  valuesModule,
  xModule,
]
export const defaultCommand: CommandModule | null = null // bootstrapModule

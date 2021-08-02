import { CommandModule } from 'yargs'
import { module as chartModule } from '../chart/index'
import { module as applyModule } from './apply'
import { module as bashModule } from './bash'
import { module as bootstrapModule } from './bootstrap'
import { module as checkPoliciesModule } from './check-policies'
import { module as commitModule } from './commit'
import { module as decryptModule } from './decrypt'
import { module as destroyModule } from './destroy'
import { module as diffModule } from './diff'
import { module as encryptModule } from './encrypt'
import { module as genDroneModule } from './gen-drone'
import { module as genSopsModule } from './gen-sops'
import { module as hfModule } from './hf'
import { module as lintModule } from './lint'
import { module as playgroundModule } from './playground'
import { module as pullModule } from './pull'
import { module as regCredModule } from './regcred'
import { module as rotateKeysModule } from './rotate-keys'
import { module as scoreTemplatesModule } from './score-templates'
import { module as serverModule } from './server'
import { module as statusModule } from './status'
import { module as syncModule } from './sync'
import { module as templateModule } from './template'
import { module as testModule } from './test'
import { module as validateTemplatesModule } from './validate-templates'
import { module as validateValuesModule } from './validate-values'
import { module as valuesModule } from './values'
import { module as xModule } from './x'

export { module as chart } from '../chart/index'
export { module as apply } from './apply'
export { module as bash } from './bash'
export { module as bootstrap } from './bootstrap'
export { module as checkPolicies } from './check-policies'
export { module as commit } from './commit'
export { module as decrypt } from './decrypt'
export { module as destroy } from './destroy'
export { module as diff } from './diff'
export { module as encrypt } from './encrypt'
export { module as genDrone } from './gen-drone'
export { module as genSops } from './gen-sops'
export { module as hf } from './hf'
export { module as lint } from './lint'
export { module as pull } from './pull'
export { module as regCred } from './regcred'
export { module as rotateKeys } from './rotate-keys'
export { module as scoreTemplates } from './score-templates'
export { module as server } from './server'
export { module as status } from './status'
export { module as sync } from './sync'
export { module as template } from './template'
export { module as test } from './test'
export { module as validateTemplates } from './validate-templates'
export { module as validateValues } from './validate-values'
export { module as values } from './values'
export { module as x } from './x'

export const commands: CommandModule[] = [
  applyModule,
  bashModule,
  bootstrapModule,
  chartModule,
  checkPoliciesModule,
  commitModule,
  decryptModule,
  destroyModule,
  diffModule,
  encryptModule,
  genDroneModule,
  genSopsModule,
  hfModule,
  lintModule,
  playgroundModule,
  pullModule,
  regCredModule,
  rotateKeysModule,
  scoreTemplatesModule,
  serverModule,
  statusModule,
  syncModule,
  templateModule,
  testModule,
  validateTemplatesModule,
  validateValuesModule,
  valuesModule,
  xModule,
]
export const defaultCommand: CommandModule | null = null // bootstrapModule

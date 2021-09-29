import { CommandModule } from 'yargs'
import { module as applyModule } from './apply.js'
import { module as bashModule } from './bash.js'
import { module as bootstrapModule } from './bootstrap.js'
import { module as checkPoliciesModule } from './check-policies.js'
import { module as commitModule } from './commit.js'
import { module as decryptModule } from './decrypt.js'
import { module as destroyModule } from './destroy.js'
import { module as diffModule } from './diff.js'
import { module as encryptModule } from './encrypt.js'
import { module as filesModule } from './files.js'
import { module as genDroneModule } from './gen-drone.js'
import { module as genSopsModule } from './gen-sops.js'
import { module as hfModule } from './hf.js'
import { module as lintModule } from './lint.js'
import { module as playgroundModule } from './playground.js'
import { module as pullModule } from './pull.js'
import { module as scoreTemplatesModule } from './score-templates.js'
import { module as serverModule } from './server.js'
import { module as statusModule } from './status.js'
import { module as syncModule } from './sync.js'
import { module as templateModule } from './template.js'
import { module as testModule } from './test.js'
import { module as validateTemplatesModule } from './validate-templates.js'
import { module as validateValuesModule } from './validate-values.js'
import { module as valuesModule } from './values.js'
import { module as waitForModule } from './wait-for.js'
import { module as xModule } from './x.js'

export { module as apply } from './apply.js'
export { module as bash } from './bash.js'
export { module as bootstrap } from './bootstrap.js'
export { module as checkPolicies } from './check-policies.js'
export { module as commit } from './commit.js'
export { module as decrypt } from './decrypt.js'
export { module as destroy } from './destroy.js'
export { module as diff } from './diff.js'
export { module as encrypt } from './encrypt.js'
export { module as files } from './files.js'
export { module as genDrone } from './gen-drone.js'
export { module as genSops } from './gen-sops.js'
export { module as hf } from './hf.js'
export { module as lint } from './lint.js'
export { module as pull } from './pull.js'
export { module as scoreTemplates } from './score-templates.js'
export { module as server } from './server.js'
export { module as status } from './status.js'
export { module as sync } from './sync.js'
export { module as template } from './template.js'
export { module as test } from './test.js'
export { module as validateTemplates } from './validate-templates.js'
export { module as validateValues } from './validate-values.js'
export { module as values } from './values.js'
export { module as waitFor } from './wait-for.js'
export { module as x } from './x.js'

export const commands: CommandModule[] = [
  applyModule,
  bashModule,
  bootstrapModule,
  checkPoliciesModule,
  commitModule,
  decryptModule,
  destroyModule,
  diffModule,
  encryptModule,
  filesModule,
  genDroneModule,
  genSopsModule,
  hfModule,
  lintModule,
  playgroundModule,
  pullModule,
  scoreTemplatesModule,
  serverModule,
  statusModule,
  syncModule,
  templateModule,
  testModule,
  validateTemplatesModule,
  validateValuesModule,
  valuesModule,
  waitForModule,
  xModule,
]
export const defaultCommand: CommandModule | null = null // bootstrapModule

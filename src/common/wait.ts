import { promises as dnsPromises } from 'dns'
import { sleep } from 'zx'
import { OtomiDebugger, terminal } from './debug'

export const waitForDns = async (
  host: string,
  maxRetries = 1000,
  intervalMs = 1000,
  expectedConfirmations = 10,
  log: OtomiDebugger | undefined = undefined,
): Promise<void> => {
  const d = log || terminal(`waitForDns`)
  let confirmations = 0
  let attempt = 0
  do {
    attempt += 1
    if (attempt > maxRetries) {
      d.error(`Could not resolve DNS recods for the ${host} host`)
      throw Error()
    }
    try {
      await dnsPromises.lookup(host)
      confirmations += 1
      console.info(`Attempt #${attempt}/${maxRetries}: ${confirmations}/${expectedConfirmations} checks succeeded`)
    } catch (e) {
      console.error(`Attempt #${attempt}/${maxRetries}: `, e.message)
    }
    await sleep(intervalMs)
  } while (confirmations < expectedConfirmations)
}

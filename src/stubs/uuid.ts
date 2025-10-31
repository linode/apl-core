// This is a stub implementation of the 'uuid' module for testing purposes.
// Jest would try to load the actual yargs module.
// Which fails because its esm module and Jest is not configured to handle esm modules.
let counter = 0

export function v4(): string {
  counter += 1
  return `00000000-0000-0000-0000-${counter.toString().padStart(12, '0')}`
}

export function v1(): string {
  counter += 1
  return `00000000-0000-0000-0000-${counter.toString().padStart(12, '0')}`
}

export function v3(_name: string | Buffer, _namespace: string | Buffer): string {
  counter += 1
  return `00000000-0000-0000-0000-${counter.toString().padStart(12, '0')}`
}

export function v5(_name: string | Buffer, _namespace: string | Buffer): string {
  counter += 1
  return `00000000-0000-0000-0000-${counter.toString().padStart(12, '0')}`
}

// Reset counter for test isolation (call in beforeEach if needed)
export function resetCounter(): void {
  counter = 0
}

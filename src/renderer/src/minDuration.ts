/** Resolves after max(task, ms); errors are swallowed (keeps the Scan button busy state visible) */
export async function withMinDuration(task: () => unknown, ms: number): Promise<void> {
  await Promise.allSettled([Promise.resolve().then(task), new Promise<void>((resolve) => setTimeout(resolve, ms))])
}

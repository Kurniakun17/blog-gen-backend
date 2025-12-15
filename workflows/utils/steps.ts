export type TimedResult<T> = { value: T; durationMs: number };

export async function runStep<T>(
  phase: string,
  startData: unknown,
  handler: () => Promise<{
    value: T;
    completeData?: Record<string, unknown>;
  }>
): Promise<TimedResult<T>> {
  if (startData === undefined) {
    console.log(
      `\n========== [workflow] phase=${phase} status=start ==========\n`
    );
  } else {
    console.log(
      `\n========== [workflow] phase=${phase} status=start ==========\n`,
      startData
    );
  }

  const start = Date.now();
  let value: T;
  let completeData: Record<string, unknown> | undefined;

  try {
    const result = await handler();
    value = result.value;
    completeData = result.completeData;
  } catch (error) {
    console.error(
      `\n========== [workflow] phase=${phase} status=error ==========\n`,
      error
    );
    throw error;
  }

  const durationMs = Date.now() - start;
  const endData =
    completeData === undefined
      ? { durationMs }
      : { durationMs, ...completeData };
  console.log(
    `\n========== [workflow] phase=${phase} status=complete ==========\n`,
    endData
  );
  return { value, durationMs };
}

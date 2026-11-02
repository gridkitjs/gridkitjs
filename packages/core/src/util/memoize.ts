/**
 * `compute`, remembering its last arguments and result: called again with
 * every argument identical (`Object.is`), it hands back that same result
 * rather than recomputing. One slot is all a stage needs — the grid asks for
 * the current view, never an older one — and returning the same reference is
 * what lets each later stage, and a renderer, skip work of its own.
 */
export function memoizeLast<Args extends readonly unknown[], Result>(
  compute: (...args: Args) => Result,
): (...args: Args) => Result {
  let last: { readonly args: Args; readonly result: Result } | undefined;
  return (...args) => {
    const previous = last;
    if (
      previous !== undefined &&
      args.every((arg, index) => Object.is(arg, previous.args[index]))
    ) {
      return previous.result;
    }
    const result = compute(...args);
    last = { args, result };
    return result;
  };
}

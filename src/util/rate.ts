// Adapted from https://github.com/google/closure-library/blob/7818ff7dc0b53555a7fb3c3427e6761e88bde3a2/closure/goog/functions/functions.js#L506

/**
 * Throttles the execution of a function.
 *
 * The function is called on the leading and trailing edges of the timeout.
 *
 * @param f The function to be throttled.
 * @param ms The time in milliseconds to throttle the function execution.
 */
export const throttle = <F extends (...args: any[]) => void>(f: F, ms: number): F => {
  let timeout: NodeJS.Timeout | null = null;
  let storedArgs: Parameters<F> | null = null;
  let isFireEnqueued = false;

  /** Handles the timeout and triggers the function execution. */
  const maybeFire = () => {
    timeout = null;
    if (isFireEnqueued) {
      isFireEnqueued = false;
      fire();
    }
  };

  /** Triggers the function execution and sets the timeout in case there's another call during the timeout. */
  const fire = () => {
    timeout = setTimeout(maybeFire, ms);
    const args = storedArgs as Parameters<F>;
    storedArgs = null; // Avoid a space leak by clearing stored arguments.
    f(...args);
  };

  /** The throttled function that will be returned. */
  const throttled = (...args: Parameters<F>) => {
    storedArgs = args;
    if (timeout === null) {
      fire();
    } else {
      isFireEnqueued = true;
    }
  };

  return throttled as F;
};

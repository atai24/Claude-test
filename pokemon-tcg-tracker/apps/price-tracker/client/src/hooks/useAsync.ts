import { useState, useEffect, useCallback, useRef } from "react";

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[]
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const counter = useRef(0);

  const run = useCallback(() => {
    const id = ++counter.current;
    setState({ status: "loading" });
    fn()
      .then((data) => {
        if (id === counter.current) setState({ status: "success", data });
      })
      .catch((err: unknown) => {
        if (id === counter.current)
          setState({
            status: "error",
            error: err instanceof Error ? err : new Error(String(err)),
          });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, reload: run };
}

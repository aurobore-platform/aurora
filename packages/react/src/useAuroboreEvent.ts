import { useEffect, useRef, useState } from "react";
import { subscribeAuroboreEvent } from "./events.js";

export function useAuroboreEvent<T = unknown>(name: string, handler: (data: T) => void): void;
export function useAuroboreEvent<T = unknown>(name: string): T | undefined;
export function useAuroboreEvent<T = unknown>(
  name: string,
  handler?: (data: T) => void,
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return subscribeAuroboreEvent(name, (payload) => {
      if (handlerRef.current) {
        handlerRef.current(payload as T);
      } else {
        setData(payload as T);
      }
    });
  }, [name]);

  return handler ? undefined : data;
}

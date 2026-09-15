import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface ControllableResult<T> {
  value: T;
  setValue: (next: T) => void;
  isControlled: boolean;
}

/**
 * 受控 / 非受控通用的取值逻辑。
 *
 * 受控时以外部值为准，但内部先乐观更新一次，
 * 这样即使外部没有立刻回传新值，界面也不会「卡住」。
 */
export function useControllable<T>(
  controlled: T | undefined,
  defaultValue: T,
): ControllableResult<T> {
  const isControlled = controlled !== undefined;
  const [inner, setInner] = useState<T>(defaultValue);
  const lastControlled = useRef<T | undefined>(controlled);

  if (isControlled && lastControlled.current !== controlled) {
    lastControlled.current = controlled;
    if (inner !== controlled) setInner(controlled as T);
  }

  const setValue = useCallback((next: T) => {
    setInner(next);
  }, []);

  return {
    value: isControlled ? (controlled as T) : inner,
    setValue,
    isControlled,
  };
}

/** 取受控 / 非受控的初始值 */
export function useInitial<T>(controlled: T | undefined, defaultValue: T): T {
  return useMemo(() => (controlled !== undefined ? controlled : defaultValue), []);
}

/**
 * 「以内部状态为准，外部改动则同步」的双向策略。
 *
 * 适合语法、时区这类切换项：即使使用方只传了 `syntax` 而没在回调里回写，
 * 组件内部也能正常切换；而一旦使用方主动改了 prop，界面会立刻跟随。
 */
export function useSyncedState<T>(
  prop: T | undefined,
  defaultValue: T,
): [T, (next: T) => void] {
  const [inner, setInner] = useState<T>(() => (prop !== undefined ? prop : defaultValue));
  const previousProp = useRef<T | undefined>(prop);

  useEffect(() => {
    if (prop === previousProp.current) return;
    previousProp.current = prop;
    if (prop !== undefined && prop !== inner) setInner(prop);
  }, [prop, inner]);

  return [inner, setInner];
}

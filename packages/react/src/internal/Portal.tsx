import { createPortal } from 'react-dom';
import { useEffect, useState, type ReactNode } from 'react';

/** 把内容渲染到 body 下的独立容器，避免被父级 overflow / transform 裁剪 */
export function Portal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const element = document.createElement('div');
    element.setAttribute('data-cron-kit-portal', 'true');
    document.body.appendChild(element);
    setHost(element);
    return () => {
      if (element.parentNode) element.parentNode.removeChild(element);
    };
  }, []);

  if (!host) return null;
  return createPortal(children, host);
}

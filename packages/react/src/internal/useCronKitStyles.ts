import { useEffect } from 'react';
import { ensureCronKitStyles } from 'cron-kit-core/styles';

let injectedOnce = false;

/**
 * 保证样式表已注入。
 * 幂等且在服务端渲染环境下自动跳过，因此在渲染期调用是安全的。
 */
export function useCronKitStyles(): void {
  if (!injectedOnce) {
    injectedOnce = true;
    ensureCronKitStyles();
  }
  useEffect(() => {
    ensureCronKitStyles();
  }, []);
}

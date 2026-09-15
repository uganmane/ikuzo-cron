import { useState } from 'react';
import {
  CronBuilder,
  CronExplain,
  CronExpression,
  CronInput,
  CronModal,
  CronNextRuns,
  CronPanel,
  CronTemplates,
  type CronTheme,
} from 'cron-kit-react';

type Demo = 'panel' | 'form' | 'parts';

export default function App() {
  const [theme, setTheme] = useState<CronTheme>('light');
  const [demo, setDemo] = useState<Demo>('panel');

  // 完整面板
  const [panelExpr, setPanelExpr] = useState('0 0 9 ? * MON-FRI *');
  const [showSyntaxSwitch, setShowSyntaxSwitch] = useState(true);

  // 表单集成：模拟业务表单
  const [form, setForm] = useState({
    name: '每日数据同步',
    cron: '0 0 2 * * ?',
    enabled: true,
  });
  const [submitted, setSubmitted] = useState<string | null>(null);

  // 子组件演示
  const [partsExpr, setPartsExpr] = useState('0 0/5 * * * ?');
  const [part, setPart] = useState<'builder' | 'expression' | 'runs' | 'explain' | 'templates'>(
    'builder',
  );

  // 独立弹窗演示
  const [modalOpen, setModalOpen] = useState(false);
  const [modalExpr, setModalExpr] = useState('0 0 0 L * ? *');

  return (
    <div className={`page${theme === 'dark' ? ' page--dark' : ''}`}>
      <header className="page__head">
        <div>
          <h1>cron-kit-react</h1>
          <p>
            React 版 Cron 表达式可视化组件 · 零运行时依赖 · 支持 Quartz / Spring / Linux / Node 四种语法
          </p>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')}
          />
          <span>深色主题</span>
        </label>
      </header>

      <nav className="page__nav">
        {(
          [
            ['panel', '完整面板'],
            ['form', '表单 / 弹窗集成'],
            ['parts', '按需组合'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`page__nav-item${demo === key ? ' is-active' : ''}`}
            onClick={() => setDemo(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {demo === 'panel' ? (
        <section className="card">
          <div className="card__head">
            <h2>完整面板</h2>
            <p>
              同时提供可视化配置、表达式编辑、常用模板、字段说明与最近运行时间。
              表达式按字段拆开显示，正在编辑的字段会高亮，点一下即可切换。
            </p>
            <label className="switch">
              <input
                type="checkbox"
                checked={showSyntaxSwitch}
                onChange={(event) => setShowSyntaxSwitch(event.target.checked)}
              />
              <span>显示 Quartz / Spring / Linux / Node 语法切换（可选项）</span>
            </label>
          </div>
          <CronPanel
            value={panelExpr}
            onChange={setPanelExpr}
            theme={theme}
            nextRunsCount={6}
            showSyntaxSwitch={showSyntaxSwitch}
          />
        </section>
      ) : null}

      {demo === 'form' ? (
        <div className="grid-2">
          <section className="card">
            <div className="card__head">
              <h2>嵌进表单弹窗</h2>
              <p>
                <code>CronInput</code> 的第一个回调参数就是表达式字符串，可直接放进 antd 的{' '}
                <code>Form.Item</code>。点击「配置」在弹窗里可视化编辑，确认后回填。
              </p>
            </div>

            <div className="form">
              <label className="form__row">
                <span className="form__label">任务名称</span>
                <input
                  className="form__input"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>

              <label className="form__row">
                <span className="form__label">执行时间</span>
                <CronInput
                  value={form.cron}
                  onChange={(expression) => setForm({ ...form, cron: expression })}
                  theme={theme}
                  locale="zh-CN"
                />
              </label>

              <div className="form__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setSubmitted(JSON.stringify(form, null, 2))}
                >
                  提交
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setForm({ name: '每日数据同步', cron: '0 0 2 * * ?', enabled: true });
                    setSubmitted(null);
                  }}
                >
                  重置
                </button>
              </div>

              {submitted ? (
                <pre className="result">{submitted}</pre>
              ) : (
                <p className="hint">点击「提交」查看表单收集到的值。</p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h2>独立弹窗</h2>
              <p>
                <code>CronModal</code> 可单独作为唤起容器，内容自定义。
              </p>
            </div>
            <div className="inline-demo">
              <code className="mono">{modalExpr}</code>
              <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
                打开弹窗
              </button>
            </div>

            <CronModal
              open={modalOpen}
              theme={theme}
              width={900}
              title="选择执行时间"
              onCancel={() => setModalOpen(false)}
              onOk={() => setModalOpen(false)}
            >
              <CronPanel
                value={modalExpr}
                onChange={setModalExpr}
                theme={theme}
                flat
                title={null}
              />
            </CronModal>
          </section>
        </div>
      ) : null}

      {demo === 'parts' ? (
        <div className="grid-2">
          <section className="card">
            <div className="card__head">
              <h2>按需组合</h2>
              <p>五个子组件可以单独引入，也能自由拼装；每个都自带 ck-root 与主题，单独用也有完整样式。</p>
            </div>

            <div className="seg">
              {(
                [
                  ['builder', 'CronBuilder'],
                  ['expression', 'CronExpression'],
                  ['runs', 'CronNextRuns'],
                  ['explain', 'CronExplain'],
                  ['templates', 'CronTemplates'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`seg__item${part === key ? ' is-active' : ''}`}
                  onClick={() => setPart(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              {part === 'builder' ? (
                <CronBuilder value={partsExpr} onChange={setPartsExpr} theme={theme} layout="stack" />
              ) : null}
              {part === 'expression' ? (
                <CronExpression value={partsExpr} onChange={setPartsExpr} theme={theme} showSuccessTip />
              ) : null}
              {part === 'runs' ? (
                <CronNextRuns value={partsExpr} theme={theme} count={8} />
              ) : null}
              {part === 'explain' ? <CronExplain value={partsExpr} theme={theme} /> : null}
              {part === 'templates' ? (
                <CronTemplates value={partsExpr} onSelect={setPartsExpr} theme={theme} />
              ) : null}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h2>实时结果</h2>
              <p>当前表达式与运行时间。</p>
            </div>
            <CronNextRuns value={partsExpr} theme={theme} count={5} title="最近运行时间" />
          </section>
        </div>
      ) : null}

      <footer className="page__foot">
        <span>cron-kit-react · MIT License</span>
        <span>零运行时依赖，样式自动注入</span>
      </footer>
    </div>
  );
}

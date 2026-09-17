const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename);
}
const React = require('react');
const { create, act } = require('react-test-renderer');
const WorkoutLog = require('../src/components/tools/WorkoutLog.tsx').default;
const { estimateOneRepMax, bestStrengthEstimate, safeReturnPath, isCompletedSet, parseWorkoutDate } = require('../src/lib/workoutMetrics.ts');
let view, calls, failSave, failLoad, storage;
const response = (data, ok = true) => ({ ok, json: async () => data });
beforeEach(() => {
  calls = []; failSave = false; failLoad = false; storage = new Map();
  global.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) };
  global.sessionStorage = { getItem: () => null, removeItem() {} };
  global.window = { location: { search: '' }, scrollTo() {}, confirm: () => true, dispatchEvent() {} };
  global.fetch = async (url, options = {}) => {
    calls.push({ url, ...options });
    if (url === '/api/client/tracker') return response({ workouts: [], templates: [] }, options.method ? !failSave : !failLoad);
    if (url === '/api/member/programs') return response({ programs: [] });
    return response({ found: false });
  };
});
afterEach(async () => { if (view) await act(async () => { view.unmount(); }); view = null; });
async function mount(id = 'athlete-a') { await act(async () => { view = create(React.createElement(WorkoutLog, { userId: id })); }); }
function textOf(node) { return typeof node === 'string' ? node : (node.children || []).map(textOf).join(' '); }
function button(text) { return view.root.findAllByType('button').find(b => textOf(b).includes(text)); }
async function loadPush() { await act(async () => { button('PUSH').props.onClick(); }); }
async function enterSet() {
  const weight = view.root.findAllByType('input').find(i => i.props['aria-label'] === 'Bench Press set 1 weight in pounds');
  const reps = view.root.findAllByType('input').find(i => i.props['aria-label'] === 'Bench Press set 1 repetitions or time');
  await act(async () => { weight.props.onChange({ target: { value: '100' } }); reps.props.onChange({ target: { value: '5' } }); });
}
test('estimates reject ranges, durations, high reps and warm-up movements', () => {
  assert.equal(estimateOneRepMax('100', '6'), 120);
  assert.equal(estimateOneRepMax('100', '1'), 100);
  for (const reps of ['6-8', '30s', '15', '5.5', '-1', '0']) assert.equal(estimateOneRepMax('100', reps), 0);
  assert.equal(estimateOneRepMax('100lb', '6'), 0);
  assert.equal(bestStrengthEstimate('Warm-up 1: Box jump', [{ weight:'30', reps:'5' }]), 0);
  assert.equal(bestStrengthEstimate('Assisted pull-up', [{ weight:'50', reps:'5' }]), 0);
  assert.equal(isCompletedSet({ weight:'', reps:'30s', rpe:'' }), true);
  assert.equal(isCompletedSet({ weight:'100', reps:'6-8', rpe:'' }), false);
});
test('login return paths allow internal deep links but reject external redirects', () => {
  assert.equal(safeReturnPath('/clients/workout-log?session=legs'), '/clients/workout-log?session=legs');
  for (const url of ['https://example.com', '//example.com', '/\\example.com', 'javascript:alert(1)', '/\n/example.com']) assert.equal(safeReturnPath(url), '/clients');
});
test('calendar dates support ISO and legacy Canadian dates without changing the day', () => {
  for (const [value, expected] of [['2026-09-15', '2026-09-15'], ['15/09/2026', '2026-09-15'], ['09/15/2026', '2026-09-15']]) {
    const parsed = parseWorkoutDate(value);
    assert.ok(parsed);
    assert.equal(`${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`, expected);
  }
  for (const invalid of ['', '31/02/2026', 'not-a-date', null]) assert.equal(parseWorkoutDate(invalid), null);
});
test('failed account save preserves entries and draft, with no success or XP claim', async () => {
  await mount(); await loadPush(); await enterSet(); failSave = true;
  await act(async () => { await button('Save Workout').props.onClick(); });
  assert.match(JSON.stringify(view.toJSON()), /Could not save to your account/);
  assert.doesNotMatch(JSON.stringify(view.toJSON()), /Workout saved to your account/);
  assert.equal(view.root.findAllByType('input').find(i => i.props['aria-label'] === 'Bench Press set 1 weight in pounds').props.value, '100');
  assert.ok(storage.has('ts-workout-draft:athlete-a'));
  assert.equal(calls.filter(c => c.url === '/api/gamification/workout').length, 0);
});
test('successful save uses one account write and displays confirmation after clearing builder', async () => {
  await mount(); await loadPush(); await enterSet();
  await act(async () => { await button('Save Workout').props.onClick(); });
  assert.equal(calls.filter(c => c.url === '/api/client/tracker' && c.method === 'PUT').length, 1);
  assert.match(JSON.stringify(view.toJSON()), /Workout saved to your account/);
  assert.equal(storage.has('ts-workout-draft:athlete-a'), false);
  const saved = JSON.parse(calls.find(c => c.method === 'PUT').body).workouts[0];
  assert.equal(saved.exercises[0].sets[0].reps, '5');
  assert.equal(saved.exercises.length, 1); // untouched target ranges do not become logged work
});
test('history load failure prevents writes rather than overwriting cloud data', async () => {
  failLoad = true; await mount(); await loadPush(); await enterSet();
  assert.equal(button('Save Workout').props.disabled, true);
  assert.match(JSON.stringify(view.toJSON()), /Could not load your account data/);
});
test('draft restores for its owner but never for a different account', async () => {
  await mount(); await loadPush(); await enterSet();
  await act(async () => { view.unmount(); });
  await mount('athlete-b');
  assert.equal(view.root.findAllByType('input').some(i => i.props['aria-label'] === 'Bench Press set 1 weight in pounds'), false);
  await act(async () => { view.unmount(); });
  await mount('athlete-a');
  assert.equal(view.root.findAllByType('input').find(i => i.props['aria-label'] === 'Bench Press set 1 weight in pounds').props.value, '100');
});

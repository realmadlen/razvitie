// Разминка: генераторы задач на счёт в уме, уравнения и логику.
// Каждая задача создаётся заново, поэтому никогда не повторяется дословно.

export type WarmupKind = 'arith' | 'percent' | 'linear' | 'quadratic' | 'square' | 'fraction' | 'sequence' | 'syllogism'

export interface WarmupTask {
  kind: WarmupKind
  label: string
  prompt: string
  /** Числовые ответы (для квадратного уравнения — два корня, порядок не важен) */
  answers?: number[]
  /** Вариант выбора для логики */
  choices?: string[]
  correctChoice?: number
  explain: string
  hint?: string
}

const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
const sgn = (n: number) => (n < 0 ? `− ${-n}` : `+ ${n}`)
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

function arith(): WarmupTask {
  const t = rnd(0, 2)
  if (t === 0) {
    const a = rnd(12, 99), b = rnd(3, 9)
    return { kind: 'arith', label: 'Счёт в уме', prompt: `${a} × ${b}`, answers: [a * b], explain: `${a} × ${b} = ${Math.floor(a / 10) * 10} × ${b} + ${a % 10} × ${b} = ${a * b}`, hint: 'Разложите на десятки и единицы.' }
  }
  if (t === 1) {
    const a = rnd(120, 899), b = rnd(110, 799)
    return { kind: 'arith', label: 'Счёт в уме', prompt: `${a} + ${b}`, answers: [a + b], explain: `${a} + ${b} = ${a + b}`, hint: 'Сложите сотни, потом десятки и единицы.' }
  }
  const a = rnd(300, 999), b = rnd(105, 299)
  return { kind: 'arith', label: 'Счёт в уме', prompt: `${a} − ${b}`, answers: [a - b], explain: `${a} − ${b} = ${a - b}`, hint: 'Вычтите круглое число, затем поправку.' }
}

function percent(): WarmupTask {
  const p = pick([5, 10, 15, 20, 25, 30, 40, 50, 75])
  const base = pick([40, 60, 80, 120, 160, 200, 240, 320, 360, 480, 600, 800])
  const v = (p * base) / 100
  if (!Number.isInteger(v)) return percent()
  return { kind: 'percent', label: 'Проценты', prompt: `${p}% от ${base}`, answers: [v], explain: `${base} × ${p} / 100 = ${v}`, hint: '10% — это число без последнего нуля.' }
}

function linear(): WarmupTask {
  const a = rnd(2, 9), x = rnd(-9, 12), b = rnd(-20, 20) || 5
  const c = a * x + b
  return { kind: 'linear', label: 'Уравнение', prompt: `${a}x ${sgn(b)} = ${c}`, answers: [x], explain: `${a}x = ${c} ${sgn(-b)} = ${c - b}, x = ${c - b} / ${a} = ${x}`, hint: 'Перенесите число вправо, затем разделите.' }
}

function quadratic(): WarmupTask {
  let r1 = rnd(-7, 7), r2 = rnd(-7, 7)
  if (r1 === r2) r2 = r1 + rnd(1, 4)
  const b = -(r1 + r2), c = r1 * r2
  const bTxt = b === 0 ? '' : b === 1 ? ' + x' : b === -1 ? ' − x' : ` ${sgn(b)}x`
  const cTxt = c === 0 ? '' : ` ${sgn(c)}`
  return {
    kind: 'quadratic', label: 'Квадратное уравнение', prompt: `x²${bTxt}${cTxt} = 0`, answers: [r1, r2],
    explain: `По теореме Виета: x₁ + x₂ = ${-b}, x₁ · x₂ = ${c}. Корни: ${r1} и ${r2}.`,
    hint: 'Теорема Виета: сумма корней равна −b, произведение равно c.',
  }
}

function square(): WarmupTask {
  const n = rnd(11, 29)
  return { kind: 'square', label: 'Квадрат числа', prompt: `${n}²`, answers: [n * n], explain: `${n}² = ${n * n}`, hint: `(${Math.floor(n / 10) * 10} + ${n % 10})² = a² + 2ab + b²` }
}

function fraction(): WarmupTask {
  const d1 = pick([2, 3, 4, 5, 6]), d2 = pick([2, 3, 4, 6, 8])
  const n1 = rnd(1, d1 - 1), n2 = rnd(1, d2 - 1)
  const num = n1 * d2 + n2 * d1, den = d1 * d2
  const g = gcd(num, den)
  const rn = num / g, rd = den / g
  // Отвечаем числителем после приведения к знаменателю rd
  return {
    kind: 'fraction', label: 'Дроби', prompt: `${n1}/${d1} + ${n2}/${d2} = ?/${rd}`, answers: [rn],
    explain: `Общий знаменатель ${den}: ${n1 * d2}/${den} + ${n2 * d1}/${den} = ${num}/${den} = ${rn}/${rd}`,
    hint: 'Приведите к общему знаменателю.',
  }
}

function sequence(): WarmupTask {
  const t = rnd(0, 4)
  let xs: number[] = [], rule = ''
  if (t === 0) { const a = rnd(1, 20), d = rnd(3, 12); xs = Array.from({ length: 6 }, (_, i) => a + i * d); rule = `каждый раз +${d}` }
  else if (t === 1) { const a = rnd(1, 4), q = rnd(2, 3); xs = Array.from({ length: 6 }, (_, i) => a * q ** i); rule = `каждый раз ×${q}` }
  else if (t === 2) { const s = rnd(1, 4); xs = Array.from({ length: 6 }, (_, i) => (i + s) ** 2); rule = 'квадраты подряд идущих чисел' }
  else if (t === 3) { const a = rnd(1, 3), b = rnd(2, 5); xs = [a, b]; for (let i = 2; i < 6; i++) xs.push(xs[i - 1] + xs[i - 2]); rule = 'каждое число — сумма двух предыдущих' }
  else { const a = rnd(2, 6); xs = Array.from({ length: 6 }, (_, i) => a + (i * (i + 1)) / 2 * 2); rule = 'разности растут: +2, +4, +6…' }
  const ans = xs[5]
  return { kind: 'sequence', label: 'Логика: продолжите ряд', prompt: `${xs.slice(0, 5).join(', ')}, ?`, answers: [ans], explain: `Правило: ${rule}. Ответ: ${ans}.`, hint: 'Посмотрите на разности или отношения соседних чисел.' }
}

const SYLLOGISMS: { p: string; ok: boolean; why: string }[] = [
  { p: 'Все кошки — млекопитающие. Мурка — кошка. Значит, Мурка — млекопитающее.', ok: true, why: 'Классический верный силлогизм: свойство всего класса переходит на его члена.' },
  { p: 'Все розы — цветы. Некоторые цветы быстро вянут. Значит, некоторые розы быстро вянут.', ok: false, why: 'Быстро вянущие цветы могут вообще не быть розами.' },
  { p: 'Ни одна рыба не дышит лёгкими. Дельфин дышит лёгкими. Значит, дельфин — не рыба.', ok: true, why: 'Если ни один член класса не обладает свойством, то обладающий им — вне класса.' },
  { p: 'Если идёт дождь, асфальт мокрый. Асфальт мокрый. Значит, идёт дождь.', ok: false, why: 'Асфальт мог намокнуть от поливальной машины. Это «утверждение следствия» — частая ошибка.' },
  { p: 'Если идёт дождь, асфальт мокрый. Асфальт сухой. Значит, дождя нет.', ok: true, why: 'Отрицание следствия (modus tollens) — верный вывод.' },
  { p: 'Некоторые врачи — женщины. Некоторые женщины — блогеры. Значит, некоторые врачи — блогеры.', ok: false, why: 'Две группы «некоторых» могут вовсе не пересекаться.' },
  { p: 'Все квадраты — прямоугольники. Все прямоугольники — четырёхугольники. Значит, все квадраты — четырёхугольники.', ok: true, why: 'Транзитивность: A ⊂ B ⊂ C, значит A ⊂ C.' },
  { p: 'Все успешные стартапы рискуют. Наш стартап рискует. Значит, он будет успешным.', ok: false, why: 'Риск — общее свойство, а не гарантия успеха (ещё и ошибка выжившего).' },
  { p: 'Если число делится на 6, оно делится на 3. Число 21 делится на 3. Значит, 21 делится на 6.', ok: false, why: 'Обратное утверждение неверно: 21 / 6 = 3,5.' },
  { p: 'Каждый, кто читает каждый день, расширяет словарный запас. Аня не расширяет словарный запас. Значит, Аня читает не каждый день.', ok: true, why: 'Отрицание следствия — вывод верный.' },
]

function syllogism(): WarmupTask {
  const s = pick(SYLLOGISMS)
  return { kind: 'syllogism', label: 'Логика: верен ли вывод?', prompt: s.p, choices: ['Вывод верен', 'Вывод неверен'], correctChoice: s.ok ? 0 : 1, explain: s.why }
}

const MATH = [arith, percent, linear, quadratic, square, fraction]

/** Набор разминки: две математические задачи и одна логическая */
export function makeWarmup(count = 3): WarmupTask[] {
  const out: WarmupTask[] = []
  const pool = [...MATH].sort(() => Math.random() - 0.5)
  for (let i = 0; i < count - 1; i++) out.push(pool[i % pool.length]())
  out.push(Math.random() < 0.5 ? sequence() : syllogism())
  return out
}

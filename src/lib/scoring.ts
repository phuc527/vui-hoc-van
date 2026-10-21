import { samplePathPoints } from './handwriting'

export function starsFor(score: number): number {
  if (score >= 90) return 3
  if (score >= 70) return 2
  if (score >= 40) return 1
  return 0
}

/** Tỉ lệ đúng → điểm 0..100 */
export const percent = (correct: number, total: number) =>
  total <= 0 ? 0 : Math.round((correct / total) * 100)

/**
 * Chấm bài tô/đồ chữ theo pixel (dùng khi ký tự không có mẫu path viết tay).
 * target: các điểm mẫu thuộc nét chữ; inked(x,y): bé đã tô tại điểm đó chưa;
 * outsideInk: tỉ lệ mực nằm ngoài chữ (0..1);
 * overInkRatio: tỉ lệ tổng lượng mực so với diện tích nét chuẩn (> 1.6 là tô bôi đen gian lận).
 */
export function traceScore(
  target: { x: number; y: number }[],
  inked: (x: number, y: number) => boolean,
  outsideInk: number,
  overInkRatio = 1,
): number {
  if (target.length === 0) return 0
  const covered = target.filter((p) => inked(p.x, p.y)).length / target.length
  const outPenalty = Math.max(0, outsideInk - 0.35)
  const blobPenalty = Math.max(0, overInkRatio - 1.45) * 0.9
  return Math.max(0, Math.min(100, Math.round((covered - outPenalty - blobPenalty) * 100)))
}

export interface Point { x: number; y: number }

function pathLength(pts: Point[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return len
}

function minDist(p: Point, pts: Point[]): { dist: number; idx: number } {
  let best = Infinity, idx = 0
  for (let i = 0; i < pts.length; i++) {
    const d = Math.hypot(p.x - pts[i].x, p.y - pts[i].y)
    if (d < best) { best = d; idx = i }
  }
  return { dist: best, idx }
}

/** Nội suy thêm điểm cho nét vẽ tay của học sinh để khoảng cách giữa 2 điểm liên tiếp <= step */
function densifyStroke(stroke: Point[], step = 4): Point[] {
  if (stroke.length <= 1) return stroke
  const out: Point[] = [stroke[0]]
  for (let i = 1; i < stroke.length; i++) {
    const a = stroke[i - 1], b = stroke[i]
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const n = Math.max(1, Math.ceil(dist / step))
    for (let k = 1; k <= n; k++) {
      out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })
    }
  }
  return out
}

/**
 * Chấm điểm đường nét viết tay của học sinh so với các nét mẫu (geo.paths):
 * 1. Độ phủ (Coverage): Mỗi nét mẫu phải được các điểm bút của học sinh đi qua trong bán kính cho phép (`tolerance`).
 * 2. Độ chính xác (Precision): Các điểm bút của học sinh phải nằm gần đường tâm nét mẫu (nếu vẽ ngoằn ngoèo ra ngoài hoặc tô kín vùng trống giữa chữ 'o', 'a' sẽ bị trừ nặng).
 * 3. Chống tô bôi đen / quẹt đi quẹt lại (Length ratio): Tổng chiều dài đường bút học sinh vẽ không được vượt quá chiều dài chuẩn của các nét chữ quá nhiều.
 * 4. Hướng viết (Direction): Kiểm tra chiều đi của bút dọc theo nét mẫu (từ điểm đặt bút tới điểm kết thúc).
 */
export function evaluateHandwritingStrokes(
  targetPaths: string[],
  userStrokes: Point[][],
  tolerance: number,
): number {
  const sampledTargets = targetPaths.map((d) => samplePathPoints(d, 4)).filter((pts) => pts.length > 0)
  const allTargetPts = sampledTargets.flat()
  if (allTargetPts.length === 0 || userStrokes.length === 0) return 0

  const denseStrokes = userStrokes.map((s) => densifyStroke(s, 4)).filter((s) => s.length > 0)
  const allUserPts = denseStrokes.flat()
  if (allUserPts.length < 3) return 0

  // 1. Độ phủ từng nét mẫu (mỗi nét phải được viết, tránh bỏ sót nét phụ như dấu mũ, dấu ngang chữ đ/t)
  let totalTargetCovered = 0
  let strokesMissed = 0
  for (const tPts of sampledTargets) {
    const coveredCount = tPts.filter((tp) => minDist(tp, allUserPts).dist <= tolerance).length
    const ratio = coveredCount / tPts.length
    if (ratio < 0.4) strokesMissed++
    totalTargetCovered += coveredCount
  }
  const coverage = totalTargetCovered / allTargetPts.length

  // 2. Độ chính xác (Precision): bao nhiêu % điểm bút của học sinh thực sự bám sát đường nét mẫu
  let onTrackCount = 0
  let totalDeviation = 0
  for (const up of allUserPts) {
    const { dist } = minDist(up, allTargetPts)
    if (dist <= tolerance) onTrackCount++
    else totalDeviation += Math.min(2, (dist - tolerance) / tolerance)
  }
  const precision = onTrackCount / allUserPts.length
  const deviationPenalty = totalDeviation / allUserPts.length

  // 3. Kiểm tra tổng chiều dài nét vẽ so với tổng chiều dài nét mẫu (chống cheat tô kín/quẹt qua lại)
  const targetLen = sampledTargets.reduce((sum, pts) => sum + pathLength(pts), 0)
  const userLen = denseStrokes.reduce((sum, pts) => sum + pathLength(pts), 0)
  const lenRatio = targetLen > 0 ? userLen / targetLen : 1
  // Nếu tổng chiều dài vẽ vượt quá 1.45 lần chiều dài nét chữ chuẩn → phạt nặng (scribble/fill cheat)
  const excessLengthPenalty = lenRatio > 1.45 ? Math.min(1, (lenRatio - 1.45) * 0.9) : 0
  // Nếu chỉ chấm vài điểm ngắn ngủn (userLen quá ngắn so với targetLen)
  const shortLengthFactor = targetLen > 20 ? Math.min(1, userLen / (targetLen * 0.7)) : 1

  // 4. Kiểm tra hướng đặt bút (tránh viết ngược từ cuối nét lên đầu nét)
  let reversePenalty = 0
  for (const tPts of sampledTargets) {
    if (tPts.length < 6) continue
    // Tìm nét vẽ của học sinh khớp nhiều nhất với nét mẫu này
    let bestStroke: Point[] | null = null
    let bestMatch = 0
    for (const us of denseStrokes) {
      const m = us.filter((p) => minDist(p, tPts).dist <= tolerance * 1.1).length
      if (m > bestMatch) { bestMatch = m; bestStroke = us }
    }
    if (bestStroke && bestStroke.length >= 4 && bestMatch >= 4) {
      const nearPts = bestStroke
        .map((p) => minDist(p, tPts))
        .filter((x) => x.dist <= tolerance * 1.2)
      if (nearPts.length >= 4) {
        const firstIdx = nearPts[0].idx
        const lastIdx = nearPts[nearPts.length - 1].idx
        const isClosedLoop = Math.hypot(tPts[0].x - tPts[tPts.length - 1].x, tPts[0].y - tPts[tPts.length - 1].y) < tolerance
        if (!isClosedLoop && lastIdx < firstIdx - tPts.length * 0.25) {
          reversePenalty += 0.15
        }
      }
    }
  }

  const missedStrokePenalty = strokesMissed * (0.35 / Math.max(1, sampledTargets.length))
  const baseScore = (coverage * 0.55 + precision * 0.45) * shortLengthFactor
  const finalRatio = baseScore - deviationPenalty * 0.45 - excessLengthPenalty - missedStrokePenalty - reversePenalty

  return Math.max(0, Math.min(100, Math.round(finalRatio * 100)))
}

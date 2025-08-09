/**
 * Takes an array of items and assigns them to lanes based on start/end dates.
 * @returns an array of arrays containing items.
 */
export default function assignLanes(items) {
  const sorted = [...items].sort((a, b) => new Date(a.start) - new Date(b.start));
  const lanes = [];
  const placed = [];
  for (const it of sorted) {
    let lane = 0;
    for (; lane < lanes.length; lane++) {
      if (new Date(lanes[lane]) < new Date(it.start)) break;
    }
    if (lane === lanes.length) lanes.push(it.end); else lanes[lane] = it.end;
    placed.push({ ...it, lane });
  }
  return { placed, laneCount: lanes.length };
}
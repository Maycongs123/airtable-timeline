import ReactDOM from "react-dom/client";
import { useState } from "react";
import timelineItemsData from "./timelineItems.js"; 
import assignLanes from "./assignLanes.js"

const DAY = 86400000;

const toDate = (iso) => new Date(iso);

const diffDays = (a, b) => Math.max(0, Math.round((toDate(b) - toDate(a)) / DAY));

const addDays = (iso, n) => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const palette = ["#2e90fa", "#ef4444", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ec4899", "#94a3b8"];
const colorFor = (id) => palette[id % palette.length];

function monthLabel(iso) {
  const d = toDate(iso);
  return d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function App() {
  const [timelineItems, setTimelineItems] = useState(timelineItemsData);
  const [editingId, setEditingId] = useState(null); 
  const [editedName, setEditedName] = useState(""); 
  const [draggingItem, setDraggingItem] = useState(null);
  const [draggingEdge, setDraggingEdge] = useState(null); 
  const [startPosition, setStartPosition] = useState(null); 
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false); 
  const [previewItem, setPreviewItem] = useState(null); 

  const minStart = timelineItems.reduce((m, it) => Math.min(m, +new Date(it.start)), Infinity);
  const maxEnd = timelineItems.reduce((m, it) => Math.max(m, +new Date(it.end)), -Infinity);
  const minDate = new Date(minStart).toISOString().slice(0, 10);
  const maxDate = new Date(maxEnd).toISOString().slice(0, 10);

  const viewStart = addDays(minDate, -1);
  const viewEnd = addDays(maxDate, 1);

  const PX_PER_DAY = 56;
  const totalDays = diffDays(viewStart, viewEnd) + 1;
  const daysArr = Array.from({ length: totalDays }, (_, i) => addDays(viewStart, i));
  const trackW = totalDays * PX_PER_DAY;

  const months = [];
  let segStart = daysArr[0], count = 1;
  for (let i = 1; i < daysArr.length; i++) {
    const a = toDate(daysArr[i - 1]), b = toDate(daysArr[i]);
    const changed = a.getUTCMonth() !== b.getUTCMonth() || a.getUTCFullYear() !== b.getUTCFullYear();
    if (changed) {
      months.push({ label: monthLabel(segStart), width: count * PX_PER_DAY });
      segStart = daysArr[i]; count = 1;
    } else count++;
  }
  months.push({ label: monthLabel(segStart), width: count * PX_PER_DAY });

  const { placed, laneCount } = assignLanes(timelineItems);

  const ROW_H = 40;
  const ROW_GAP = 10;
  const MONTH_H = 28;
  const DAYS_H = 28;
  const HEADER_H = MONTH_H + DAYS_H;
  const trackH = HEADER_H + laneCount * (ROW_H + ROW_GAP) + 12;

  const xOf = (iso) => diffDays(viewStart, iso) * PX_PER_DAY;
  const widthOf = (a, b) => (diffDays(a, b) + 1) * PX_PER_DAY;

  const handleEditName = (id, currentName) => {
    setEditingId(id);
    setEditedName(currentName);
  };

  const handleSaveEdit = (id) => {
    const updatedItems = timelineItems.map((item) =>
      item.id === id ? { ...item, name: editedName } : item
    );
    setTimelineItems(updatedItems); 
    setEditingId(null);
    setEditedName("");
  };

  const handleEdgeDragStart = (item, edge, e) => {
    setDraggingItem(item);
    setDraggingEdge(edge);
    setStartPosition(e.clientX);
    setDragOffset(0);
    setIsDragging(false); 
    setPreviewItem({ ...item }); 
  };

  const handleDragStart = (item, e) => {
    if (e.target.className !== "bar-resize-left" && e.target.className !== "bar-resize-right") {
      setDraggingItem(item);
      setStartPosition(e.clientX);
      setDragOffset(0);
      setIsDragging(true); 
    }
  };

  const handleDragMove = (e) => {
    if (draggingItem) {
      const offset = e.clientX - startPosition;
      setDragOffset(offset);
      setPreviewItem({
        ...draggingItem,
        start: addDays(draggingItem.start, Math.round(dragOffset / PX_PER_DAY)), 
        end: addDays(draggingItem.end, Math.round(dragOffset / PX_PER_DAY))
      });
    }
  };

  const handleDragEnd = () => {
    if (draggingItem && isDragging) {
      const newStart = addDays(draggingItem.start, Math.round(dragOffset / PX_PER_DAY));
      const newEnd = addDays(draggingItem.end, Math.round(dragOffset / PX_PER_DAY));
      const updatedItems = timelineItems.map((item) =>
        item.id === draggingItem.id ? { ...item, start: newStart, end: newEnd } : item
      );
      setTimelineItems(updatedItems); 
      setDraggingItem(null);
      setStartPosition(null);
      setDragOffset(0);
      setPreviewItem(null); 
    } else if (draggingItem && draggingEdge) {
      let newStart = draggingItem.start;
      let newEnd = draggingItem.end;

      if (draggingEdge === "left") {
        newStart = addDays(draggingItem.start, Math.round(dragOffset / PX_PER_DAY)); 
      } else if (draggingEdge === "right") {
        newEnd = addDays(draggingItem.end, Math.round(dragOffset / PX_PER_DAY));
      }

      const updatedItems = timelineItems.map((item) =>
        item.id === draggingItem.id ? { ...item, start: newStart, end: newEnd } : item
      );
      setTimelineItems(updatedItems);
      setDraggingItem(null);
      setStartPosition(null);
      setDragOffset(0);
      setDraggingEdge(null);
      setPreviewItem(null);
    }
  };

  return (
    <div
      className="gantt-board"
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
    >
      <div className="gantt-months" style={{ width: trackW, height: MONTH_H }}>
        {months.map((m, i) => (
          <div key={i} className="gantt-month" style={{ width: m.width }}>{m.label}</div>
        ))}
      </div>

      <div className="gantt-days" style={{ width: trackW, height: DAYS_H }}>
        {daysArr.map((iso) => {
          const d = toDate(iso);
          const w = d.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" });
          const n = d.getUTCDate();
          return (
            <div key={iso} className="gantt-day" style={{ width: PX_PER_DAY }}>
              <span className="w">{w}</span><span className="n">{n}</span>
            </div>
          );
        })}
      </div>

      <div className="gantt-track" style={{ width: trackW, height: trackH }}>
        <div className="gantt-rows" style={{ top: HEADER_H }}>
          {Array.from({ length: laneCount }).map((_, i) => (
            <div
              key={i}
              className={`gantt-row ${i % 2 ? "alt" : ""}`}
              style={{ top: i * (ROW_H + ROW_GAP), height: ROW_H + ROW_GAP }}
            >
              <div className="row-label">Lane {i + 1}</div>
            </div>
          ))}
        </div>

        <div className="gantt-grid" style={{ top: HEADER_H }}>
          {daysArr.map((iso, i) => (
            <div
              key={iso}
              className={`vline ${i % 7 === 0 ? "major" : ""}`}
              style={{ left: i * PX_PER_DAY }}
            />
          ))}
        </div>

        <div className="gantt-bars" style={{ top: HEADER_H }}>
          {placed.map((it) => {
            const left = xOf(it.start);
            const width = widthOf(it.start, it.end);
            const top = it.lane * (ROW_H + ROW_GAP);
            return (
              <div
                key={it.id}
                className="gantt-bar"
                style={{
                  left,
                  top,
                  width,
                  height: ROW_H,
                  background: colorFor(it.id),
                  cursor: "pointer", 
                }}
                title={`${it.name}\n${it.start} — ${it.end}`}
                onMouseDown={(e) => handleDragStart(it, e)} 
              >

                <div
                  className="bar-resize-left"
                  style={{ position: "absolute", left: -6, top: 0, height: ROW_H, width: 12, cursor: "ew-resize" }}
                  onMouseDown={(e) => handleEdgeDragStart(it, "left", e)} 
                />

                <div
                  className="bar-resize-right"
                  style={{ position: "absolute", right: -6, top: 0, height: ROW_H, width: 12, cursor: "ew-resize" }}
                  onMouseDown={(e) => handleEdgeDragStart(it, "right", e)} 
                />

                <div
                  className="bar-name"
                  onDoubleClick={() => handleEditName(it.id, it.name)} 
                >
                  {editingId === it.id ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={() => handleSaveEdit(it.id)} 
                    />
                  ) : (
                    it.name
                  )}
                </div>
                <div className="bar-dates">{it.start} — {it.end}</div>
              </div>
            );
          })}
        </div>

        {previewItem && (
          <div
            className="gantt-bar"
            style={{
              left: xOf(previewItem.start),
              top: previewItem.lane * (ROW_H + ROW_GAP),
              width: widthOf(previewItem.start, previewItem.end),
              height: ROW_H,
              background: colorFor(previewItem.id),
              opacity: 0.5, 
              position: "absolute",
              zIndex: 1, 
            }}
          />
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

import useDragScroll from "./useDragScroll";

export default function DragScrollWrapper({ children, style = {}, className = "" }) {
  const dragRef = useDragScroll();

  return (
    <div
      ref={dragRef}
      className={`drag-scroll-wrapper ${className}`}
      style={{ overflowY: "auto", cursor: "grab", userSelect: "none", ...style }}
    >
      {children}
    </div>
  );
}
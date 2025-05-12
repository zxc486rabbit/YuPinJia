import { useRef, useEffect } from "react";

export default function useDragScroll() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startY;
    let scrollTop;

    const mouseDown = (e) => {
      isDown = true;
      el.classList.add("drag-scroll-active");
      startY = e.pageY - el.offsetTop;
      scrollTop = el.scrollTop;
    };

    const mouseUp = () => {
      isDown = false;
      el.classList.remove("drag-scroll-active");
    };

    const mouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const y = e.pageY - el.offsetTop;
      const walk = (y - startY) * 1.5;
      el.scrollTop = scrollTop - walk;
    };

    el.addEventListener("mousedown", mouseDown);
    el.addEventListener("mouseleave", mouseUp);
    el.addEventListener("mouseup", mouseUp);
    el.addEventListener("mousemove", mouseMove);

    return () => {
      el.removeEventListener("mousedown", mouseDown);
      el.removeEventListener("mouseleave", mouseUp);
      el.removeEventListener("mouseup", mouseUp);
      el.removeEventListener("mousemove", mouseMove);
    };
  }, []);

  return ref;
}
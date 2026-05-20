import cx from "classnames";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import resizeObserver from "metabase/lib/resize-observer";
import { Icon, Text } from "metabase/ui";

import { Icon } from "metabase/ui";
import { Ellipsified } from "metabase/ui/components/data-display/Ellipsified";

import S from "./SortableHeaderPill.module.css";

interface SortableHeaderPillProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  sort?: "asc" | "desc";
  align?: "left" | "right";
}

export const SortableHeaderPill = forwardRef<
  HTMLDivElement,
  SortableHeaderPillProps
>(function SortableHeaderPill({ name, sort, align, className, ...props }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldWrap, setShouldWrap] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textElement = textRef.current;

    if (!container || !textElement) {
      return;
    }

    const checkOverflow = () => {
      // Get the container width
      const containerWidth = container.offsetWidth;

      // Get computed styles to account for padding
      const containerStyles = window.getComputedStyle(container);
      const paddingLeft = parseFloat(containerStyles.paddingLeft) || 0;
      const paddingRight = parseFloat(containerStyles.paddingRight) || 0;

      // Account for icon width and gap if sort icon exists
      const iconWidth = sort ? 14 : 0; // Icon size (10px) + gap (0.25rem ≈ 4px)
      const gap = parseFloat(containerStyles.gap) || 0;

      // Calculate available width for text
      const availableWidth =
        containerWidth - paddingLeft - paddingRight - iconWidth - gap;

      // Create a temporary span to measure text width accurately
      const measureSpan = document.createElement("span");
      measureSpan.style.position = "absolute";
      measureSpan.style.visibility = "hidden";
      measureSpan.style.whiteSpace = "nowrap";
      measureSpan.style.fontSize = window.getComputedStyle(textElement).fontSize;
      measureSpan.style.fontWeight =
        window.getComputedStyle(textElement).fontWeight;
      measureSpan.style.fontFamily =
        window.getComputedStyle(textElement).fontFamily;
      measureSpan.textContent = name;
      document.body.appendChild(measureSpan);

      const textWidth = measureSpan.offsetWidth;
      document.body.removeChild(measureSpan);

      // If text width exceeds available width, enable wrapping
      setShouldWrap(textWidth > availableWidth);
    };

    // Initial check
    checkOverflow();

    // Subscribe to resize events
    const handleResize = () => {
      checkOverflow();
    };

    resizeObserver.subscribe(container, handleResize);

    return () => {
      resizeObserver.unsubscribe(container, handleResize);
    };
  }, [name, sort]);

  // Combine refs
  const combinedRef = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  return (
    <div
      ref={combinedRef}
      className={cx(
        S.pill,
        className,
        { [S.alignRight]: align === "right" },
        { [S.wrap]: shouldWrap },
      )}
      {...props}
    >
      <Text
        ref={textRef}
        c="inherit"
        fz="inherit"
        lh="inherit"
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        {name}
      </Text>
      {sort && (
        <Icon
          name={sort === "asc" ? "chevronup" : "chevrondown"}
          size={10}
          className={S.sortIcon}
          data-testid="header-sort-indicator"
        />
      )}
    </div>
  );
});

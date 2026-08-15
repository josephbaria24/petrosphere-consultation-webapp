// Tremor BarList [v1.0.0] — extended for soft fills + reference line

import React from "react"

import { cx, focusRing } from "../lib/utils"

type Bar<T> = T & {
  key?: string
  href?: string
  value: number
  name: string
  /** Optional Tailwind bg classes for the bar fill */
  color?: string
}

type ReferenceLineConfig = {
  /** Position on the same scale as values (e.g. 70 with scaleMax=100 → 70%) */
  value: number
  label?: string
}

interface BarListProps<T = unknown>
  extends React.HTMLAttributes<HTMLDivElement> {
  data: Bar<T>[]
  valueFormatter?: (value: number) => string
  showAnimation?: boolean
  onValueChange?: (payload: Bar<T>) => void
  sortOrder?: "ascending" | "descending" | "none"
  /**
   * If set, bar widths use this as 100% (e.g. 100 for score percents).
   * Otherwise widths scale relative to the max value in `data`.
   */
  scaleMax?: number
  /** Vertical dashed marker across the bar track (e.g. lowest score). */
  referenceLine?: ReferenceLineConfig | null
  /**
   * Vertical density of rows. 1 = default; lower squeezes bars; higher expands.
   * Typical range: 0.5 – 1.5
   */
  density?: number
}

function densityStyles(density: number) {
  const d = Math.min(Math.max(density, 0.45), 1.6)
  if (d <= 0.55) {
    return {
      row: "h-4",
      hover: "group-hover:h-5",
      gap: "space-y-0.5",
      valueGap: "mb-0.5",
      label: "text-[11px]",
      value: "text-[11px]",
    }
  }
  if (d <= 0.7) {
    return {
      row: "h-5",
      hover: "group-hover:h-6",
      gap: "space-y-0.5",
      valueGap: "mb-0.5",
      label: "text-xs",
      value: "text-xs",
    }
  }
  if (d <= 0.85) {
    return {
      row: "h-6",
      hover: "group-hover:h-7",
      gap: "space-y-1",
      valueGap: "mb-1",
      label: "text-xs",
      value: "text-xs",
    }
  }
  if (d <= 1.05) {
    return {
      row: "h-8",
      hover: "group-hover:h-10",
      gap: "space-y-1.5",
      valueGap: "mb-1.5",
      label: "text-sm",
      value: "text-sm",
    }
  }
  if (d <= 1.25) {
    return {
      row: "h-9",
      hover: "group-hover:h-11",
      gap: "space-y-2",
      valueGap: "mb-2",
      label: "text-sm",
      value: "text-sm",
    }
  }
  return {
    row: "h-10",
    hover: "group-hover:h-12",
    gap: "space-y-2.5",
    valueGap: "mb-2.5",
    label: "text-base",
    value: "text-base",
  }
}

function BarListInner<T>(
  {
    data = [],
    valueFormatter = (value) => value.toString(),
    showAnimation = false,
    onValueChange,
    sortOrder = "descending",
    scaleMax,
    referenceLine,
    density = 1,
    className,
    ...props
  }: BarListProps<T>,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const Component = onValueChange ? "button" : "div"
  const sortedData = React.useMemo(() => {
    if (sortOrder === "none") {
      return data
    }
    return [...data].sort((a, b) => {
      return sortOrder === "ascending" ? a.value - b.value : b.value - a.value
    })
  }, [data, sortOrder])

  const maxValue = React.useMemo(() => {
    if (scaleMax && scaleMax > 0) return scaleMax
    return Math.max(...sortedData.map((item) => item.value), 0)
  }, [sortedData, scaleMax])

  const widths = React.useMemo(() => {
    return sortedData.map((item) =>
      item.value === 0 || maxValue === 0
        ? 0
        : Math.max(Math.min((item.value / maxValue) * 100, 100), 2),
    )
  }, [sortedData, maxValue])

  const referenceLeft =
    referenceLine && maxValue > 0
      ? Math.min(Math.max((referenceLine.value / maxValue) * 100, 0), 100)
      : null

  const styles = densityStyles(density)

  return (
    <div
      ref={forwardedRef}
      className={cx("flex justify-between space-x-6", className)}
      aria-sort={sortOrder}
      tremor-id="tremor-raw"
      {...props}
    >
      <div className={cx("relative w-full", styles.gap)}>
        {referenceLeft != null && (
          <div
            className="pointer-events-none absolute inset-y-0 z-10"
            style={{ left: `${referenceLeft}%` }}
            aria-hidden
          >
            <div className="h-full w-0 border-l-2 border-dashed border-red-500" />
            {referenceLine?.label && (
              <span className="absolute top-0 left-1 -translate-y-full whitespace-nowrap rounded bg-background/90 px-1 py-0.5 text-[10px] font-semibold text-red-500">
                {referenceLine.label}
              </span>
            )}
          </div>
        )}

        {sortedData.map((item, index) => (
          <Component
            key={item.key ?? item.name}
            onClick={() => {
              onValueChange?.(item)
            }}
            className={cx(
              // base
              "group relative w-full rounded",
              // focus
              focusRing,
              onValueChange
                ? [
                    "-m-0! cursor-pointer",
                    "hover:bg-muted/40",
                  ]
                : "",
            )}
          >
            <div
              className={cx(
                // base — soft / translucent fill like Tremor demo
                "flex items-center rounded origin-left",
                // snappy hover (do not reuse enter-animation duration)
                "transition-[height,box-shadow,filter] duration-75 ease-out",
                styles.row,
                styles.hover,
                "group-hover:shadow-sm group-hover:brightness-[1.03]",
                item.color || "bg-blue-200 dark:bg-blue-900",
                onValueChange
                  ? "group-hover:ring-1 group-hover:ring-black/5 dark:group-hover:ring-white/10"
                  : "",
                showAnimation && "animate-in fade-in slide-in-from-left-2 duration-300",
                {
                  "mb-0": index === sortedData.length - 1,
                },
              )}
              style={{ width: `${widths[index]}%` }}
            >
              <div className={cx("absolute left-2 z-[1] flex max-w-full pr-2")}>
                {item.href ? (
                  <a
                    href={item.href}
                    className={cx(
                      "truncate whitespace-nowrap rounded-sm",
                      styles.label,
                      "text-gray-900 dark:text-gray-50",
                      "hover:underline hover:underline-offset-2",
                      focusRing,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {item.name}
                  </a>
                ) : (
                  <p
                    className={cx(
                      "truncate whitespace-nowrap",
                      styles.label,
                      "text-gray-900 dark:text-gray-50",
                    )}
                  >
                    {item.name}
                  </p>
                )}
              </div>
            </div>
          </Component>
        ))}
      </div>
      <div>
        {sortedData.map((item, index) => (
          <div
            key={item.key ?? item.name}
            className={cx(
              "flex items-center justify-end",
              styles.row,
              index === sortedData.length - 1 ? "mb-0" : styles.valueGap,
            )}
          >
            <p
              className={cx(
                "truncate whitespace-nowrap leading-none tabular-nums",
                styles.value,
                "text-gray-900 dark:text-gray-50",
              )}
            >
              {valueFormatter(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

BarListInner.displayName = "BarList"

const BarList = React.forwardRef(BarListInner) as <T>(
  p: BarListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => ReturnType<typeof BarListInner>

export { BarList, type BarListProps, type Bar }

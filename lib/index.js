// @ts-check
"use client"

import { cloneElement, createElement, useEffect, useRef, useState } from "react"

/** @param {(string | undefined | null)[]} args */
const clsx = (...args) => args.filter(Boolean).join(" ")

function ZoomIcon() {
  return createElement(
    "svg",
    {
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.5,
      style: { height: "24px", width: "24px" },
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
    },
    createElement("path", {
      d: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    }),
  )
}

/**
 * @typedef {object} MediumImageProps
 * @property {import("react").ReactElement} children
 * @property {import("react").ReactElement | null} zoomIcon
 * @property {string | null} className
 * @property {number} margin
 * @property {string} zoomImageText
 */

/** @param {MediumImageProps} props */
export default function MediumImage({
  children,
  className,
  margin = 24,
  zoomIcon,
  zoomImageText = "Zoom image",
}) {
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const ref = useRef(/** @type {HTMLImageElement | null} */ (null))
  const touchYStartRef = useRef(/** @type {number | undefined} */ (undefined))
  const touchYEndRef = useRef(/** @type {number | undefined} */ (undefined))

  const [isOpen, setIsOpen] = useState(false)
  const imgAlt = ref.current?.getAttribute("alt")

  useEffect(() => {
    const image = ref.current
    const container = containerRef.current
    if (!image || !container) return

    const controller = new AbortController()
    const { signal } = controller

    if (isOpen) {
      // Set the container size to the image size
      container.style.height = `${image.offsetHeight}px`
      container.style.width = `${image.offsetWidth}px`

      // Calculate the xy coordinates based on how far the image is from the top
      // of the viewport.
      const imageRect = image.getBoundingClientRect()
      const translateX =
        (window.innerWidth - imageRect.width) / 2 - imageRect.left
      const translateY =
        (window.innerHeight - imageRect.height) / 2 - imageRect.top

      // Calculate the scale based on the smallest dimension of the image and
      // fill the viewport.
      const scale = Math.min(
        (window.innerWidth - margin) / imageRect.width,
        (window.innerHeight - margin) / imageRect.height,
      )

      image.style.zIndex = "999"
      image.style.position = "absolute"
      image.style.transform = `translate(${translateX}px,${translateY}px) scale(${scale})`

      /** @param {KeyboardEvent} e */
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setIsOpen(false)
        } else {
          e.preventDefault()
        }
      }

      const handleClose = () => setIsOpen(false)

      /** @param {TouchEvent} e */
      const handleTouchStart = (e) => {
        if (e.changedTouches.length === 1 && e.changedTouches[0]) {
          touchYStartRef.current = e.changedTouches[0].screenY
        }
      }

      /** @param {TouchEvent} e */
      const handleTouchMove = (e) => {
        if (touchYStartRef.current != null && e.changedTouches[0]) {
          touchYEndRef.current = e.changedTouches[0].screenY

          const max = Math.max(touchYStartRef.current, touchYEndRef.current)
          const min = Math.min(touchYStartRef.current, touchYEndRef.current)
          const delta = Math.abs(max - min)
          const threshold = 10

          if (delta > threshold) {
            touchYStartRef.current = undefined
            touchYEndRef.current = undefined
            handleClose()
          }
        }
      }

      const handleTouchCancel = () => {
        touchYStartRef.current = undefined
        touchYEndRef.current = undefined
      }

      document.addEventListener("keydown", handleKeyDown, { signal })
      window.addEventListener("wheel", handleClose, { passive: true, signal })
      window.addEventListener("touchstart", handleTouchStart, { signal })
      window.addEventListener("touchmove", handleTouchMove, { signal })
      window.addEventListener("touchcancel", handleTouchCancel, { signal })
    } else {
      container.style.height = ""
      container.style.width = ""

      image.style.position = "relative"
      image.style.transform = ""

      // Wait until the element has transitioned before resetting the z-index
      // so that it doesn't get hidden behind other images or elements while
      // transitioning back into place.
      const handleTransitionEnd = () => {
        image.style.zIndex = ""
      }

      image.addEventListener("transitionend", handleTransitionEnd, { signal })
    }

    return () => controller.abort()
  }, [isOpen, margin])

  return createElement(
    "span",
    {
      className: clsx("rmi", isOpen ? "open" : "closed", className),
      ref: containerRef,
    },
    createElement(
      "button",
      {
        "aria-label": imgAlt ? `${zoomImageText}: ${imgAlt}` : zoomImageText,
        className: "rmi-zoom-button",
        onClick: () => setIsOpen(true),
        type: "button",
      },
      zoomIcon ?? createElement(ZoomIcon),
    ),
    createElement("span", { className: "rmi-overlay" }),
    cloneElement(children, {
      className: clsx("rmi-image", children.props.className),
      onClick: () => setIsOpen(!isOpen),
      ref,
    }),
  )
}

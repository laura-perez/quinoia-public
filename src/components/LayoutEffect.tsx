import { useInView } from "framer-motion";
import { cloneElement, useRef } from "react";
import React from "react";

interface LayoutEffectProps {
  children: React.ReactElement;
  className?: string;
  isInviewState: { trueState?: string; falseState?: string };
}

const LayoutEffect = ({
  children,
  className,
  isInviewState: { trueState = "", falseState = "" },
}: LayoutEffectProps) => {
  const ref = useRef<Element | null>(null);
  const isInView = useInView(ref as React.RefObject<Element>, { once: true });

  // Type-safe props extraction
  const childProps = children.props as { className?: string };
  const existingClassName = childProps.className || "";
  const newClassName = `${existingClassName} ${className || ""} ${isInView ? trueState : falseState}`;

  // Use type assertion for cloneElement - this is acceptable for complex React patterns
  return cloneElement(children, {
    ref,
    className: newClassName,
  } as any);
};

export default LayoutEffect;

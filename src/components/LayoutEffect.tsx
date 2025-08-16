import { useInView } from "framer-motion";
import { cloneElement, useRef } from "react";
import React from "react";

const LayoutEffect = ({
  children,
  className,
  isInviewState: { trueState = "", falseState = "" },
}: {
  children: React.ReactElement;
  className?: string;
  isInviewState: { trueState?: string; falseState?: string };
}) => {
  const ref = useRef<Element>(null);
  const isInView = useInView(ref as any, { once: true });

  return cloneElement(children as any, {
    ref,
    className: `${(children as any).props.className || ""} ${className || ""} ${isInView ? trueState : falseState}`,
  } as any);
};

export default LayoutEffect;

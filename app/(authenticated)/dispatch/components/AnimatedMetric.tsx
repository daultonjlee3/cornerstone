"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

type AnimatedMetricProps = {
  value: number;
  format?: (n: number) => string;
  className?: string;
};

export function AnimatedMetric({ value, format, className }: AnimatedMetricProps) {
  const spring = useSpring(value, { stiffness: 120, damping: 22, mass: 0.6 });
  const display = useTransform(spring, (v) => (format ? format(v) : String(Math.round(v))));
  const [text, setText] = useState(format ? format(value) : String(value));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(v));
    return unsub;
  }, [display]);

  return (
    <motion.span className={className} layout>
      {text}
    </motion.span>
  );
}

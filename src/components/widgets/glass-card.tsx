import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

type Props = HTMLMotionProps<"div"> & {
  glow?: boolean;
};

export const GlassCard = React.forwardRef<HTMLDivElement, Props>(
  ({ className, glow, children, ...rest }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("glass rounded-2xl shadow-elegant", glow && "shadow-glow", className)}
      {...rest}
    >
      {children}
    </motion.div>
  ),
);
GlassCard.displayName = "GlassCard";

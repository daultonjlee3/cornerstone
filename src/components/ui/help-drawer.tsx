import type { ReactNode } from "react";
import { DrawerShell } from "@/src/components/design-system";

type HelpDrawerProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** Wraps DrawerShell — use DrawerShell directly in new code. */
export function HelpDrawer({ title, open, onClose, children }: HelpDrawerProps) {
  return (
    <DrawerShell open={open} onClose={onClose} title={title} side="right">
      {children}
    </DrawerShell>
  );
}

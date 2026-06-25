import type { ReactNode } from "react";
import { ModalShell } from "@/src/components/design-system";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/** Wraps ModalShell — use ModalShell directly in new code. */
export function Modal(props: ModalProps) {
  return <ModalShell {...props} />;
}

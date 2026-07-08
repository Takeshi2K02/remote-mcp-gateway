"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog";
import { Button } from "./button";
import { AlertCircle, Loader2 } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive" | "warning" | "info" | "success";
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmationModalProps) {
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  const getButtonVariant = () => {
    if (variant === "destructive") return "destructive";
    return "default";
  };

  const getIconColor = () => {
    switch (variant) {
      case "destructive":
        return "text-destructive";
      case "warning":
        return "text-amber-500 dark:text-amber-400";
      case "success":
        return "text-emerald-500 dark:text-emerald-400";
      case "info":
        return "text-sky-500 dark:text-sky-400";
      default:
        return "text-primary";
    }
  };

  const getCustomButtonClass = () => {
    if (variant === "warning") {
      return "bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700 border-transparent shadow-sm";
    }
    if (variant === "success") {
      return "bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 border-transparent shadow-sm";
    }
    if (variant === "info") {
      return "bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-700 border-transparent shadow-sm";
    }
    return "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <AlertCircle className={`h-5 w-5 shrink-0 ${getIconColor()}`} />
            <span>{title}</span>
          </DialogTitle>
          <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {message}
          </div>
        </DialogHeader>
        <DialogFooter className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            type="button"
            className="text-xs"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={getButtonVariant()}
            onClick={handleConfirm}
            disabled={isLoading}
            type="button"
            className={`text-xs ${getCustomButtonClass()}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default ConfirmationModal;

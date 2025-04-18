'use client';

import { toast as sonnerToast } from 'sonner';

type ToastProps = {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

function toast(props: ToastProps) {
  return sonnerToast(props.title || '', {
    description: props.description,
    action: props.action ? {
      label: props.action.label,
      onClick: props.action.onClick,
    } : undefined,
  });
}

function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  };
}

export { useToast, toast };

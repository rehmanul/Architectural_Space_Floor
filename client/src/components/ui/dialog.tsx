import * as React from "react";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {children}
      </div>
    </div>
  );
};

export const DialogTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => {
  return <button {...props} />;
};

export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={`p-6 ${className || ''}`} {...props} />;
};

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  return <div className="mb-4" {...props} />;
};

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = (props) => {
  return <h2 className="text-lg font-semibold" {...props} />;
};

export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = (props) => {
  return <p className="text-sm text-gray-600" {...props} />;
};

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
  return <div className="mt-6 flex gap-2 justify-end" {...props} />;
};
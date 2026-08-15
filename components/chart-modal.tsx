import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { cn } from "../lib/utils";

type ChartModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
};

const ChartModal = ({ open, onClose, title, children, className }: ChartModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "!z-[100] !max-w-none w-[80vw] max-h-[90vh] overflow-y-auto p-6 bg-card !left-1/2",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="w-full h-full min-h-0">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartModal;

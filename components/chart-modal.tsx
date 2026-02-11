import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";


type ChartModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

const ChartModal = ({ open, onClose, title, children }: ChartModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-none w-[44vw] h-auto p-6 bg-card"
        style={{ maxWidth: '50vw' }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="w-full h-full">
          {children}
        </div>
      </DialogContent>

    </Dialog>
  );
};

export default ChartModal;

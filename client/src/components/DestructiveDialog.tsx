import { createSignal, Component, createEffect } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@client/components/ui/dialog.tsx";
import { Button } from "@client/components/ui/button.tsx";
import { IoAlertCircle } from "solid-icons/io";

interface DestructiveDialogProps {
  deleteHandler: () => void;
  triggerTitle: string;
  deleteTitle: string;
  deleteSubject: string;
}

const DestructiveDialog: Component<DestructiveDialogProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  createEffect(() => console.log("Is open changed:", isOpen()));

  return (
    <Dialog>
      <DialogTrigger class="w-full text-start cursor-pointer">{props.triggerTitle}</DialogTrigger>
      <DialogContent class="max-w-lg border-destructive">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <IoAlertCircle class="text-destructive w-7 h-7" />
            {props.deleteTitle}
          </DialogTitle>
          <DialogDescription class="mt-2">
            Are you sure you want to delete user named {props.deleteSubject}?
          </DialogDescription>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => {
              props.deleteHandler();
              setIsOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DestructiveDialog;

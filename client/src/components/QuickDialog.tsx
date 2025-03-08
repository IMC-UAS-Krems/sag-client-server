import { createSignal, Component } from "solid-js";
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
import { FaSolidCircleQuestion } from "solid-icons/fa";

interface QuickDialogProps {
  variant: "destructive" | "confirm";
  handler: () => void;
  triggerTitle: string;
  buttonText: string;
  title: string;
  description: string;
  subject: string;
  disabled?: boolean;
  disabledMessage?: string;
}

const QuickDialog: Component<QuickDialogProps> = (props) => {
  const [open, setOpen] = createSignal(false);

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger class={`w-full text-start cursor-pointer`}>{props.triggerTitle}</DialogTrigger>
      <DialogContent class={`max-w-lg ${props.variant === "destructive" ? "border-destructive" : ""}`}>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            {props.variant === "destructive" ? (
              <IoAlertCircle class="text-destructive w-7 h-7" />
            ) : (
              <FaSolidCircleQuestion class="text-primary w-7 h-7" />
            )}
            {props.title}
          </DialogTitle>
          {props.disabled ? (
            <DialogDescription class="mt-2">{props.disabledMessage}</DialogDescription>
          ) : (
            <>
              <DialogDescription class="mt-2">
                {props.description} {props.subject}?
              </DialogDescription>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={props.disabled}
            variant={props.variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              props.handler();
              setOpen(false);
            }}
          >
            {props.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickDialog;

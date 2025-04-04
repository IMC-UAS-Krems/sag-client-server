import { createSignal, Component } from "solid-js";
import { Accessor } from "solid-js";
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
  modal?: boolean;
  open?: Accessor<boolean>;
  setOpen?: (value: boolean) => void;
}

const QuickDialog: Component<QuickDialogProps> = (props) => {
  const [requestLoading, setRequestLoading] = createSignal(false);
  const [internalOpen, setInternalOpen] = createSignal(false);
  const dialogOpen = () => (props.open !== undefined ? props.open() : internalOpen());
  const setDialogOpen = (value: boolean) => {
    if (props.setOpen !== undefined) {
      props.setOpen(value);
    } else {
      setInternalOpen(value);
    }
  };

  return (
    <Dialog open={dialogOpen()} onOpenChange={setDialogOpen} modal={props.modal}>
      {props.open === undefined && (
        <DialogTrigger class={`w-full text-start cursor-pointer`}>{props.triggerTitle}</DialogTrigger>
      )}
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
            disabled={props.disabled || requestLoading()}
            variant={props.variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              setRequestLoading(true);
              props.handler();
              setDialogOpen(false);
              setRequestLoading(false);
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

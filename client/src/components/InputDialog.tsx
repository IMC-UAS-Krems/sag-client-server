import { TextField } from "@kobalte/core/text-field";
import { Setter } from "solid-js";
import { Portal } from "solid-js/web";
import { IoClose } from "solid-icons/io";

type InputDialogProps = {
  onSubmit: (e: SubmitEvent) => void;
  formRefSet: (el: Setter<HTMLFormElement>) => void;
  label: string;
  setShowInputDialog: Setter<boolean>;
};

export function InputDialog(props: InputDialogProps) {
  return (
    <div class="fixed top-0 left-0 w-screen h-screen bg-gray-300 opacity-50">
      <Portal>
        <form
          onSubmit={props.onSubmit}
          ref={props.formRefSet}
          onReset={() => props.setShowInputDialog(false)}
          class="bg-white shadow-xl rounded px-8 pt-6 pb-8 mb-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col gap gap-4"
        >
          <button class="top-2 right-2 absolute" type="reset">
            <IoClose size={24} />
          </button>
          <TextField name="name">
            <TextField.Label class="block text-gray-700 text-lg font-bold mb-2">{props.label}</TextField.Label>
            <TextField.Input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </TextField>
          <div class="flex justify-center">
            <button
              type="submit"
              class="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
            >
              Rename
            </button>
          </div>
        </form>
      </Portal>
    </div>
  );
}

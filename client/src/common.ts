import Swal from "sweetalert2";

/**
 * Notification that is displayed in the top-right corner
 *
 * Default params:
 * ```javascript
 * Notification = Swal.mixin({
 *   toast: true,
 *   position: "top-right",
 *   timer: 1500,
 *   showConfirmButton: false,
 * });
 *
 */
export const Notification = Swal.mixin({
  toast: true,
  position: "top-right",
  timer: 1500,
  showConfirmButton: false,
});

/**
 * Prompt that is displayed in the center of the screen
 *
 * Default params:
 * ```javascript
 * Prompt = Swal.mixin({
 *   showCancelButton: false,
 *   buttonsStyling: false,
 *   showDenyButton: false,
 *   showCloseButton: true,
 *   inputAttributes: {
 *     autocomplete: "off",
 *   },
 * });
 */
export const Prompt = Swal.mixin({
  showCancelButton: false,
  buttonsStyling: false,
  showDenyButton: false,
  showCloseButton: true,
  inputAttributes: {
    autocomplete: "off",
  },
  customClass: {
    confirmButton:
      "bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline",
    popup: "bg-white shadow-xl rounded px-8 pt-6 pb-8 mb-4  flex flex-col gap gap-4",
  },
});

import Swal from "sweetalert2";
import styles from "@client/styles/Common.module.css";

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
    confirmButton: styles["input-dialog-confirm-btn"],

    popup: styles["input-dialog-popup"],
  },
});

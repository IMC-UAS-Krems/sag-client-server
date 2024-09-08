import { IMenuContext } from "@client/types";
import { createContext } from "solid-js";
import { useContext } from "solid-js";
import { createSignal, JSXElement, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";

export const MenuContext = createContext<IMenuContext>();

export const MenuProvider = (props: { children: JSXElement }) => {
  const [isVisible, setIsVisible] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });

  const showMenu = (event: MouseEvent) => {
    event.preventDefault();
    setIsVisible(true);
    setPosition({ x: event.screenX, y: event.screenX });
  };

  const hideMenu = () => {
    setIsVisible(false);
  };

  return (
    <MenuContext.Provider value={{ showMenu, hideMenu, isVisible, position }}>{props.children}</MenuContext.Provider>
  );
};

export const Item = (props: { callback: () => void; children: JSXElement }) => {
  return (
    <li class="px-4 py-2 cursor-pointer hover:bg-gray-100" onClick={() => props.callback()}>
      {props.children}
    </li>
  );
};

export const ContextMenu = (props: { children: JSXElement; menuId: string }) => {
  const { hideMenu, isVisible, position } = useContext(MenuContext) as IMenuContext;

  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest(props.menuId)) return;
    hideMenu();
  };

  onCleanup(() => {
    document.removeEventListener("click", handleOutsideClick);
  });

  return (
    <>
      <Portal>
        <Show when={isVisible()}>
          <div
            id={props.menuId}
            class="absolute bg-white border border-gray-200 rounded shadow-lg"
            style={{
              left: `${position().x}px`,
              top: `${position().y}px`,
            }}
          >
            {props.children}
          </div>
        </Show>
      </Portal>
      <Show when={isVisible()}>
        <div class="fixed inset-0" onClick={hideMenu} />
      </Show>
    </>
  );
};

export default ContextMenu;

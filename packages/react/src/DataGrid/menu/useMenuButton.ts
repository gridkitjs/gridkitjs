import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import type { AttachedMenu } from "@gridkitjs/dom";
import { ANCHOR_GAP, overlayThemeClassName } from "../overlay/Overlay";

/** A menu button's menu: closed, or open from the button. */
export type MenuButtonState =
  | { readonly kind: "closed" }
  | {
      readonly kind: "open";
      /** The button, which the menu opens beside and returns focus to. */
      readonly anchor: HTMLElement;
      readonly themeClassName: string;
      /** How far from the button the menu opens. */
      readonly gap: number;
      /** The item it opens on: the first, or the last when ArrowUp opened it. */
      readonly focusItem: number;
    };

const CLOSED: MenuButtonState = { kind: "closed" };

interface UseMenuButtonOptions {
  /** How many items the menu holds, separators aside. */
  itemCount: number;
  /**
   * How far from the button its menu opens, measured as it opens. Defaults
   * to `ANCHOR_GAP`.
   */
  gap?: ((button: HTMLElement) => number) | undefined;
}

export interface MenuButtonApi {
  state: MenuButtonState;
  close: () => void;
  /** Spread on the button. */
  buttonProps: {
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    onClick: (event: MouseEvent<HTMLElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  };
  /** The menu's `behaviourRef`, for moving focus to `focusItem`. */
  behaviourRef: RefObject<AttachedMenu | null>;
}

/**
 * A button opening a menu, following the WAI-ARIA menu button pattern: a
 * click, Enter, Space or ArrowDown opens the menu with focus on its first
 * item, ArrowUp on its last, and a second click closes it. The caller draws
 * the menu in an `Overlay` while `state` is open, returning focus to its
 * `anchor`.
 */
export default function useMenuButton({
  itemCount,
  gap = () => ANCHOR_GAP,
}: UseMenuButtonOptions): MenuButtonApi {
  const [state, setState] = useState(CLOSED);
  const behaviourRef = useRef<AttachedMenu | null>(null);

  // As the menu opens, after the overlay — a child, whose layout effect runs
  // first — has focused the first item.
  useLayoutEffect(() => {
    if (state.kind === "open" && state.focusItem > 0) {
      behaviourRef.current?.focusItem(state.focusItem);
    }
  }, [state]);

  function open(button: HTMLElement, onLast: boolean): void {
    setState({
      kind: "open",
      anchor: button,
      themeClassName: overlayThemeClassName(button),
      gap: gap(button),
      focusItem: onLast ? itemCount - 1 : 0,
    });
  }

  function close(): void {
    setState(CLOSED);
  }

  return {
    state,
    close,
    buttonProps: {
      "aria-haspopup": "menu",
      "aria-expanded": state.kind === "open",
      onClick: (event) => {
        if (state.kind === "closed") {
          open(event.currentTarget, false);
        } else {
          close();
        }
      },
      onKeyDown: (event) => {
        if (
          (event.key === "ArrowDown" || event.key === "ArrowUp") &&
          state.kind === "closed"
        ) {
          event.preventDefault();
          open(event.currentTarget, event.key === "ArrowUp");
        }
      },
    },
    behaviourRef,
  };
}

import { isAlphaNumericKey, isNavigationKey } from "@silevis/reactgrid";
import React from "react";
import { cmd } from "./utils";

export const onKeyDown = (
  e:
    | React.KeyboardEvent<HTMLInputElement>
    | React.KeyboardEvent<HTMLTextAreaElement>,
  Cb?: (text: string, commit: boolean) => void,
): void => {
  if (e.target instanceof HTMLTextAreaElement && e.key === "Enter") {
    e.stopPropagation();
  }
  if (cmd(e) && e.key === "p") return;
  if ((isAlphaNumericKey(e.keyCode) && cmd(e)) || isNavigationKey(e.keyCode)) {
    e.stopPropagation();
  }
  if (cmd(e) && e.key === "a") {
    (e.target as HTMLInputElement).setSelectionRange(
      0,
      (e.target as HTMLInputElement).value.length
    );
  } else if (cmd(e) && e.key === "c") {
    const { selectionStart, selectionEnd } = e.target as HTMLInputElement;
    if (
      selectionStart === null ||
      selectionEnd === null ||
      selectionStart === selectionEnd
    )
      return;
    window.navigator.clipboard.writeText(
      (e.target as HTMLInputElement).value.slice(selectionStart, selectionEnd)
    );
  } else if (cmd(e) && e.key === "v") {
    const { selectionStart, selectionEnd } = e.target as HTMLInputElement;
    if (typeof selectionStart !== "number") return;
    if (typeof selectionEnd !== "number") return;
    window.navigator.clipboard.readText().then((text) => {
      const newText =
        (e.target as HTMLInputElement).value.slice(0, selectionStart) +
        text +
        (e.target as HTMLInputElement).value.slice(selectionEnd);
      (e.target as HTMLInputElement).value = newText;
      if (Cb) Cb(newText, false);
      (e.target as HTMLInputElement).setSelectionRange(
        selectionStart + text.length,
        selectionStart + text.length
      );
    });
  }
};

export function firstLine(s: string) {
  return s.includes("\n") ? s.split("\n")[0] + "…" : s;
}
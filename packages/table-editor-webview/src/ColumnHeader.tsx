import {
  Cell,
  CellTemplate,
  Compatible,
  getCellProperty,
  getCharFromKeyCode,
  isAlphaNumericKey,
  keyCodes,
  Uncertain,
  UncertainCompatible,
} from "@silevis/reactgrid";

import {
  onKeyDown
} from './cellUtils';

export interface ColumnHeaderCell extends Cell {
  type: "columnHeader";
  text: string;
  placeholder?: string;
  validator?: (text: string) => boolean;
  renderer?: (text: string) => React.ReactNode;
  errorMessage?: string;
}

export class ColumnHeaderCellTemplate
  implements CellTemplate<ColumnHeaderCell>
{
  getCompatibleCell(
    uncertainCell: Uncertain<ColumnHeaderCell>
  ): Compatible<ColumnHeaderCell> {
    const text = getCellProperty(uncertainCell, "text", "string");
    let placeholder: string | undefined;
    try {
      placeholder = getCellProperty(uncertainCell, "placeholder", "string");
    } catch {
      placeholder = "";
    }
    const value = parseFloat(text); // TODO more advanced parsing for all text based cells
    return { ...uncertainCell, text, value, placeholder };
  }

  update(
    cell: Compatible<ColumnHeaderCell>,
    cellToMerge: UncertainCompatible<ColumnHeaderCell>
  ): Compatible<ColumnHeaderCell> {
    return this.getCompatibleCell({
      ...cell,
      text: cellToMerge.text,
      placeholder: cellToMerge.placeholder,
    });
  }

  handleKeyDown(
    cell: Compatible<ColumnHeaderCell>,
    keyCode: number,
    ctrl: boolean,
    shift: boolean,
    alt: boolean
  ): { cell: Compatible<ColumnHeaderCell>; enableEditMode: boolean } {
    const char = getCharFromKeyCode(keyCode, shift);
    if (
      !ctrl &&
      !alt &&
      isAlphaNumericKey(keyCode) &&
      !(shift && keyCode === keyCodes.SPACE)
    )
      return {
        cell: this.getCompatibleCell({
          ...cell,
          text: shift ? char : char.toLowerCase(),
        }),
        enableEditMode: true,
      };
    return {
      cell,
      enableEditMode:
        keyCode === keyCodes.POINTER || keyCode === keyCodes.ENTER,
    };
  }

  getClassName(
    cell: Compatible<ColumnHeaderCell>,
    isInEditMode: boolean
  ): string {
    const isValid = cell.validator ? cell.validator(cell.text) : true;
    const className = cell.className ? cell.className : "";
    return `${isValid ? "valid" : "invalid"} ${
      cell.placeholder && cell.text === "" ? "placeholder" : ""
    } ${className}`;
  }

  render(
    cell: Compatible<ColumnHeaderCell>,
    isInEditMode: boolean,
    onCellChanged: (cell: Compatible<ColumnHeaderCell>, commit: boolean) => void
  ): React.ReactNode {
    if (!isInEditMode) {
      const isValid = cell.validator ? cell.validator(cell.text) : true;
      const cellText = cell.text || cell.placeholder || "";
      const textToDisplay =
        !isValid && cell.errorMessage ? cell.errorMessage : cellText;
      return cell.renderer ? cell.renderer(textToDisplay) : textToDisplay;
    }

    return (
      <input
        ref={(input) => {
          if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        }}
        defaultValue={cell.text}
        onChange={(e) => {
          onCellChanged(
            this.getCompatibleCell({ ...cell, text: e.currentTarget.value }),
            false
          );
        }}
        onBlur={(e) => {
          onCellChanged(
            this.getCompatibleCell({ ...cell, text: e.currentTarget.value }),
            (e as any).view?.event?.keyCode !== keyCodes.ESCAPE
          )
        }}
        onCopy={(e) => e.stopPropagation()}
        onCut={(e) => e.stopPropagation()}
        onPaste={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder={cell.placeholder}
        onKeyDown={onKeyDown}
      />
    );
  }
}

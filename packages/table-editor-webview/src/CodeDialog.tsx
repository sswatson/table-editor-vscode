import { useEffect, useRef } from "react";
import { TransformMode } from "./App";

interface CodeDialogProps {
  codeRequested: string;
  setCodeRequested: (codeRequested: string) => void;
  code: string;
  setCode: (code: string) => void;
  codeHistory: string[];
  codeHistoryIndex: number;
  setCodeHistoryIndex: (codeHistoryIndex: number) => void;
  submitCode: () => void;
  transformMode: TransformMode;
}

const CodeDialog = (props: CodeDialogProps) => {
  const {
    codeRequested,
    code,
    codeHistory,
    codeHistoryIndex,
    setCode,
    setCodeHistoryIndex,
    submitCode,
    setCodeRequested,
    transformMode,
  } = props;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        0,
        textareaRef.current.value.length
      );
    }
  }, []);

  return (
    <>
      {codeRequested}
      <div className="text-[0.65rem]">
        Variables:
        <ul className="ml-4 mt-1">
          {transformMode === "transformColumn" && (
            <li>
              <code>cell</code>: the value in the current cell
            </li>
          )}
          <li>
            <code>row</code>: the value of the row, as an object keyed by the
            column headers
          </li>
          <li>
            <code>table</code>: the whole table, as a list of row objects
          </li>
          <li>
            <code>index</code>: the row index of the current cell, starting from
            0
          </li>
          {transformMode === "transformColumn" && (
            <li>
              <code>previous</code>: the value of the cell above,{" "}
              <code>undefined</code> if row 1
            </li>
          )}
        </ul>
      </div>
      <textarea
        ref={textareaRef}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.shiftKey) {
            submitCode();
          } else if (event.key === "Escape") {
            setCodeRequested("");
          }
        }}
        className="w-3/4 p-2 font-mono text-[0.7rem] bg-transparent text-gray-200 border border-gray-400 rounded resize-none h-[80px]"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <div className="flex gap-4 justify-center items-center">
        {codeHistory.length > 0 && codeHistoryIndex > 0 ? (
          <button
            className="px-2 py-1 border border-gray-400 text-gray-200 rounded"
            onClick={() => {
              setCodeHistoryIndex(codeHistoryIndex - 1);
              setCode(codeHistory[codeHistoryIndex - 1]);
            }}
          >
            previous
          </button>
        ) : null}
        {codeHistory.length > 0 && codeHistoryIndex < codeHistory.length - 1 ? (
          <button
            className="px-2 py-1 border border-gray-400 text-gray-200 rounded"
            onClick={() => {
              setCodeHistoryIndex(codeHistoryIndex + 1);
              setCode(codeHistory[codeHistoryIndex + 1]);
            }}
          >
            next
          </button>
        ) : null}
        <button
          className="px-2 py-1 border border-gray-400 text-gray-200 rounded"
          onClick={() => setCodeRequested("")}
        >
          cancel
        </button>
        <button
          className="px-2 py-1 border border-gray-400 text-gray-300 rounded"
          onClick={submitCode}
        >
          submit
        </button>
      </div>
    </>
  );
};

export default CodeDialog;

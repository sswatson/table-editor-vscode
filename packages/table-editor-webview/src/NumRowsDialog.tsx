import { useEffect, useRef } from "react";

interface CodeDialogProps {
  numRowsRequest: string;
  setNumRowsRequest: (numRowsRequest: string) => void;
  numRows: string;
  setNumRows: (numRows: string) => void;
  submitNumRows: () => void;
}

const CodeDialog = (props: CodeDialogProps) => {
  const {
    numRowsRequest,
    setNumRowsRequest,
    numRows,
    setNumRows,
    submitNumRows,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(
        0,
        inputRef.current.value.length
      );
    }
  }, []);

  return (
    <>
      { numRowsRequest }
      <input
        ref={inputRef}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            submitNumRows();
          } else if (event.key === "Escape") {
            setNumRowsRequest("");
          }
        }}
        className="w-3/4 p-2 font-mono text-[0.7rem] bg-transparent text-gray-200 border border-gray-400 rounded resize-none"
        value={numRows}
        onChange={(event) => setNumRows(event.target.value)}
      />
      <div className="flex gap-4 justify-center items-center">
        <button
          className="px-2 py-1 border border-gray-400 text-gray-200 rounded"
          onClick={() => setNumRowsRequest("")}
        >
          cancel
        </button>
        <button
          className="px-2 py-1 border border-gray-400 text-gray-300 rounded"
          onClick={submitNumRows}
        >
          submit
        </button>
      </div>
    </>
  );
};

export default CodeDialog;

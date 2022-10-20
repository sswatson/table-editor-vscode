import { useEffect, useRef } from "react";

interface CodeDialogProps {
  numRequest: string;
  setNumRequest: (numRowsRequest: string) => void;
  number: string;
  setNumber: (numRows: string) => void;
  submitNumber: () => void;
}

const CodeDialog = (props: CodeDialogProps) => {
  const {
    numRequest,
    setNumRequest,
    number,
    setNumber,
    submitNumber,
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
      { numRequest }
      <input
        ref={inputRef}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            submitNumber();
          } else if (event.key === "Escape") {
            setNumRequest("");
          }
        }}
        className="w-3/4 p-2 font-mono text-[0.7rem] bg-transparent text-gray-200 border border-gray-400 rounded resize-none"
        value={number}
        onChange={(event) => setNumber(event.target.value)}
      />
      <div className="flex gap-4 justify-center items-center">
        <button
          className="px-2 py-1 border border-gray-400 text-gray-200 rounded"
          onClick={() => setNumRequest("")}
        >
          cancel
        </button>
        <button
          className="px-2 py-1 border border-gray-400 text-gray-300 rounded"
          onClick={submitNumber}
        >
          submit
        </button>
      </div>
    </>
  );
};

export default CodeDialog;

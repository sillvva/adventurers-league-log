import type { DetailedHTMLProps, PropsWithChildren, TextareaHTMLAttributes } from "react";
import { forwardRef, useEffect, useRef } from "react";

const AutoResizeTextArea = forwardRef<
  HTMLTextAreaElement,
  DetailedHTMLProps<TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement> & PropsWithChildren<{}>
>((props, ref) => {
  const newRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref && typeof ref === "function") {
      if (newRef && newRef.current) {
        ref(newRef.current);
        newRef.current.style.minHeight = "auto";
        newRef.current.style.minHeight = newRef.current.scrollHeight + 10 + "px";
      }
    }
  }, [ref, newRef]);

  return (
    <textarea
      ref={newRef}
      {...props}
      onChange={e => {
        e.target.style.minHeight = "auto";
        e.target.style.minHeight = e.target.scrollHeight + 10 + "px";
      }}
      style={{ ...props.style, height: "auto" }}
    />
  );
});
AutoResizeTextArea.displayName = "AutoResizeTextArea";

export default AutoResizeTextArea;

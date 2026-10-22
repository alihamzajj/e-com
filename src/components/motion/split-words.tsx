/**
 * Wraps each word in a mask so CSS can slide words up one after another.
 * Screen readers get the plain sentence via aria-label.
 */
export function SplitWords({ text, offset = 0 }: { text: string; offset?: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span aria-label={text} role="text">
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden className="split-word" style={{ "--i": i + offset } as React.CSSProperties}>
          <span>{word}</span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}

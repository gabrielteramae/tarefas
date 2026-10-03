export function GreetingSnap({ text }: { text: string }) {
  const chars = Array.from(text);
  return (
    <span className="greet-snap">
      {chars.map((char, index) =>
        char === " " ? (
          <span key={index} className="greet-gap" />
        ) : (
          <span
            key={index}
            className={char === "!" ? "greet-brick is-bang" : index % 2 === 0 ? "greet-brick from-left" : "greet-brick from-right"}
            style={{ animationDelay: `${index * 36}ms` }}
          >
            {char}
          </span>
        ),
      )}
    </span>
  );
}
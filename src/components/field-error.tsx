export function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="field-error text-xs text-danger">
      {children}
    </p>
  );
}

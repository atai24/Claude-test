import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function Spinner({ size = "md", label = "Loading…" }: SpinnerProps) {
  return (
    <div className={styles.container} role="status" aria-label={label}>
      <div className={`${styles.spinner} ${styles[size]}`} />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}

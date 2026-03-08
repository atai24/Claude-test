import styles from "./ErrorMessage.module.css";

interface ErrorMessageProps {
  error: Error;
  onRetry?: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className={styles.container} role="alert">
      <span className={styles.icon}>⚠</span>
      <p className={styles.message}>{error.message}</p>
      {onRetry && (
        <button className={styles.retryBtn} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

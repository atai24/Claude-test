import { Link } from "react-router-dom";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.body}>
        This page doesn&apos;t exist. Maybe the card got away?
      </p>
      <Link to="/" className={styles.homeLink}>
        Back to Sets
      </Link>
    </div>
  );
}

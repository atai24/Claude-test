import { useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type { SetSummary } from "@pokemon-tcg/shared";
import styles from "./SetBrowserPage.module.css";

function groupBySeries(sets: SetSummary[]): Map<string, SetSummary[]> {
  const map = new Map<string, SetSummary[]>();
  for (const s of sets) {
    const group = map.get(s.series) ?? [];
    group.push(s);
    map.set(s.series, group);
  }
  return map;
}

export function SetBrowserPage() {
  const state = useAsync(() => api.sets.list(), []);

  const grouped = useMemo(() => {
    if (state.status !== "success") return null;
    return groupBySeries(state.data);
  }, [state]);

  if (state.status === "loading") return <Spinner label="Loading sets…" />;
  if (state.status === "error")
    return <ErrorMessage error={state.error} onRetry={state.reload} />;

  return (
    <div>
      <h1 className={styles.pageTitle}>Pokémon TCG Sets</h1>
      <p className={styles.pageSubtitle}>
        {state.data.length} sets · click a set to browse cards
      </p>

      {grouped &&
        Array.from(grouped.entries()).map(([series, sets]) => (
          <section key={series} className={styles.seriesSection}>
            <h2 className={styles.seriesTitle}>{series}</h2>
            <div className={styles.setGrid}>
              {sets.map((set) => (
                <SetCard key={set.id} set={set} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}

function SetCard({ set }: { set: SetSummary }) {
  return (
    <Link to={`/sets/${set.id}`} className={styles.setCard}>
      <div className={styles.setLogoWrapper}>
        {set.logoUrl ? (
          <img
            src={set.logoUrl}
            alt={set.name}
            className={styles.setLogo}
            loading="lazy"
          />
        ) : (
          <div className={styles.setLogoPlaceholder}>
            <span>{set.name[0]}</span>
          </div>
        )}
      </div>
      <div className={styles.setInfo}>
        <p className={styles.setName}>{set.name}</p>
        <p className={styles.setMeta}>
          {set.series} · {set.releaseDate.slice(0, 4)}
        </p>
      </div>
    </Link>
  );
}

import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type { CardSummary } from "@pokemon-tcg/shared";
import styles from "./SearchPage.module.css";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [input, setInput] = useState(initialQ);
  const [committed, setCommitted] = useState(initialQ);
  const [page, setPage] = useState(1);

  // Sync from URL
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setInput(q);
    setCommitted(q);
    setPage(1);
  }, [searchParams]);

  const state = useAsync(
    () => api.cards.search({ q: committed, page, pageSize: 24 }),
    [committed, page]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    setSearchParams(q ? { q } : {});
    setCommitted(q);
    setPage(1);
  }

  return (
    <div>
      <h1 className={styles.title}>Search Cards</h1>

      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Card name…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
        <button type="submit" className={styles.searchBtn}>
          Search
        </button>
      </form>

      {state.status === "loading" && <Spinner label="Searching…" />}
      {state.status === "error" && (
        <ErrorMessage error={state.error} onRetry={state.reload} />
      )}
      {state.status === "success" && (
        <>
          <p className={styles.resultCount}>
            {state.data.total} result{state.data.total !== 1 ? "s" : ""}
            {committed && ` for "${committed}"`}
          </p>

          {state.data.data.length === 0 ? (
            <p className={styles.empty}>
              No cards found. Try a different search.
            </p>
          ) : (
            <div className={styles.resultGrid}>
              {state.data.data.map((card) => (
                <SearchResult key={card.id} card={card} />
              ))}
            </div>
          )}

          {(state.data.total > 24 || page > 1) && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {Math.ceil(state.data.total / 24)}
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => p + 1)}
                disabled={!state.data.hasMore}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SearchResult({ card }: { card: CardSummary }) {
  return (
    <Link to={`/cards/${card.id}`} className={styles.result}>
      <div className={styles.resultImg}>
        {card.imageSmall ? (
          <img src={card.imageSmall} alt={card.name} loading="lazy" />
        ) : (
          <span>?</span>
        )}
      </div>
      <div className={styles.resultInfo}>
        <p className={styles.resultName}>{card.name}</p>
        <p className={styles.resultMeta}>{card.setName}</p>
        {card.rarity && (
          <p className={styles.resultRarity}>{card.rarity}</p>
        )}
        {card.latestPrice !== null && (
          <p className={styles.resultPrice}>${card.latestPrice.toFixed(2)}</p>
        )}
      </div>
    </Link>
  );
}

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type { CardSummary } from "@pokemon-tcg/shared";
import styles from "./SetDetailPage.module.css";

export function SetDetailPage() {
  const { setId } = useParams<{ setId: string }>();
  const [page, setPage] = useState(1);

  const setQuery = useAsync(
    () => api.sets.get(setId!),
    [setId]
  );

  const cardsQuery = useAsync(
    () => api.sets.cards(setId!, page, 60),
    [setId, page]
  );

  if (setQuery.status === "loading") return <Spinner label="Loading set…" />;
  if (setQuery.status === "error")
    return <ErrorMessage error={setQuery.error} onRetry={setQuery.reload} />;

  const set = setQuery.data;

  return (
    <div>
      {/* Set Header */}
      <div className={styles.header}>
        {set.logoUrl && (
          <img src={set.logoUrl} alt={set.name} className={styles.setLogo} />
        )}
        <div className={styles.headerInfo}>
          <p className={styles.series}>{set.series}</p>
          <h1 className={styles.title}>{set.name}</h1>
          <div className={styles.metaRow}>
            <span className={styles.badge}>{set.releaseDate}</span>
            <span className={styles.badge}>{set.cardCount} cards</span>
            <span className={styles.badge}>
              {set.printedTotal} printed · {set.total} total
            </span>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      {cardsQuery.status === "loading" && <Spinner label="Loading cards…" />}
      {cardsQuery.status === "error" && (
        <ErrorMessage error={cardsQuery.error} onRetry={cardsQuery.reload} />
      )}
      {cardsQuery.status === "success" && (
        <>
          <div className={styles.cardGrid}>
            {cardsQuery.data.data.map((card) => (
              <CardTile key={card.id} card={card} />
            ))}
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} · {cardsQuery.data.total} cards
            </span>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((p) => p + 1)}
              disabled={!cardsQuery.data.hasMore}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CardTile({ card }: { card: CardSummary }) {
  return (
    <Link to={`/cards/${card.id}`} className={styles.cardTile}>
      <div className={styles.cardImgWrapper}>
        {card.imageSmall ? (
          <img
            src={card.imageSmall}
            alt={card.name}
            className={styles.cardImg}
            loading="lazy"
          />
        ) : (
          <div className={styles.cardImgPlaceholder}>
            <span>?</span>
          </div>
        )}
      </div>
      <div className={styles.cardInfo}>
        <p className={styles.cardName}>{card.name}</p>
        <p className={styles.cardMeta}>
          #{card.number}
          {card.rarity && ` · ${card.rarity}`}
        </p>
        {card.latestPrice !== null && (
          <p className={styles.cardPrice}>${card.latestPrice.toFixed(2)}</p>
        )}
      </div>
    </Link>
  );
}

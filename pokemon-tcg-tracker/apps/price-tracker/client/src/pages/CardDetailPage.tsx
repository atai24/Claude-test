import { useParams, Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type { PriceHistoryEntry, PriceSummary } from "@pokemon-tcg/shared";
import styles from "./CardDetailPage.module.css";

const SOURCE_COLORS: Record<string, string> = {
  TCGPLAYER: "#6366f1",
  EBAY: "#f59e0b",
  CARDMARKET: "#22c55e",
};

const CONDITION_LABELS: Record<string, string> = {
  NEAR_MINT: "Near Mint",
  LIGHTLY_PLAYED: "Lightly Played",
  MODERATELY_PLAYED: "Moderately Played",
  HEAVILY_PLAYED: "Heavily Played",
  DAMAGED: "Damaged",
  GRADED: "Graded",
};

export function CardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();

  const cardQuery = useAsync(() => api.cards.get(cardId!), [cardId]);
  const historyQuery = useAsync(
    () => api.cards.priceHistory(cardId!, { limit: 200 }),
    [cardId]
  );

  if (cardQuery.status === "loading") return <Spinner label="Loading card…" />;
  if (cardQuery.status === "error")
    return <ErrorMessage error={cardQuery.error} onRetry={cardQuery.reload} />;

  const card = cardQuery.data;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/">Sets</Link>
        <span>›</span>
        <Link to={`/sets/${card.setId}`}>{card.setName}</Link>
        <span>›</span>
        <span>{card.name}</span>
      </nav>

      <div className={styles.layout}>
        {/* Left: card image */}
        <aside className={styles.imagePanel}>
          {card.imageLarge ? (
            <img
              src={card.imageLarge}
              alt={card.name}
              className={styles.cardImage}
            />
          ) : card.imageSmall ? (
            <img
              src={card.imageSmall}
              alt={card.name}
              className={styles.cardImage}
            />
          ) : (
            <div className={styles.imagePlaceholder}>No image</div>
          )}
        </aside>

        {/* Right: details */}
        <div className={styles.detailsPanel}>
          <h1 className={styles.cardName}>{card.name}</h1>

          {/* Metadata grid */}
          <div className={styles.metaGrid}>
            <MetaItem label="Set" value={card.setName} />
            <MetaItem label="Series" value={card.setSeries} />
            <MetaItem label="Number" value={`#${card.number}`} />
            {card.supertype && (
              <MetaItem label="Supertype" value={card.supertype} />
            )}
            {card.hp && <MetaItem label="HP" value={card.hp} />}
            {card.rarity && <MetaItem label="Rarity" value={card.rarity} />}
            {card.artist && <MetaItem label="Artist" value={card.artist} />}
            {card.evolvesFrom && (
              <MetaItem label="Evolves From" value={card.evolvesFrom} />
            )}
            {card.types.length > 0 && (
              <MetaItem label="Types" value={card.types.join(", ")} />
            )}
            {card.subtypes.length > 0 && (
              <MetaItem label="Subtypes" value={card.subtypes.join(", ")} />
            )}
            {card.nationalPokedexNumbers.length > 0 && (
              <MetaItem
                label="Pokédex #"
                value={card.nationalPokedexNumbers.join(", ")}
              />
            )}
          </div>

          {/* Latest Prices Table */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Latest Prices</h2>
            {card.latestPrices.length === 0 ? (
              <p className={styles.empty}>
                No price data yet — check back after the price agent runs.
              </p>
            ) : (
              <PriceTable prices={card.latestPrices} />
            )}
          </section>
        </div>
      </div>

      {/* Price History Chart */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Price History</h2>
        {historyQuery.status === "loading" && (
          <Spinner size="sm" label="Loading price history…" />
        )}
        {historyQuery.status === "error" && (
          <p className={styles.empty}>Could not load price history.</p>
        )}
        {historyQuery.status === "success" && (
          <PriceChart history={historyQuery.data} />
        )}
      </section>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.metaItem}>
      <dt className={styles.metaLabel}>{label}</dt>
      <dd className={styles.metaValue}>{value}</dd>
    </div>
  );
}

function PriceTable({ prices }: { prices: PriceSummary[] }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Source</th>
            <th>Condition</th>
            <th>Price</th>
            <th>Recorded</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((p, i) => (
            <tr key={i}>
              <td>
                <span
                  className={styles.sourceBadge}
                  style={{ backgroundColor: SOURCE_COLORS[p.source] ?? "#6b7280" }}
                >
                  {p.source}
                </span>
              </td>
              <td>{CONDITION_LABELS[p.condition] ?? p.condition}</td>
              <td className={styles.priceCell}>
                {p.currency} {p.price.toFixed(2)}
              </td>
              <td className={styles.dateCell}>
                {new Date(p.recordedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ChartPoint {
  date: string;
  [key: string]: string | number;
}

function PriceChart({ history }: { history: PriceHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <p className={styles.empty}>
          No price history yet. Once the price agent runs, data will appear
          here.
        </p>
        <MockChart />
      </div>
    );
  }

  // Group by source and build chart data
  const sources = [...new Set(history.map((h) => h.source))];
  const byDate = new Map<string, ChartPoint>();

  for (const entry of history) {
    const date = entry.recordedAt.slice(0, 10);
    const point = byDate.get(date) ?? { date };
    point[`${entry.source} (${entry.condition})`] = entry.price;
    byDate.set(date, point);
  }

  const chartData = Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  const lines = sources.map((src) => ({
    key: src,
    color: SOURCE_COLORS[src] ?? "#6b7280",
  }));

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "var(--text-secondary)" }}
          />
          <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              stroke={l.color}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Placeholder chart shown when there's no real data */
function MockChart() {
  const mockData = [
    { date: "Jan", price: 12 },
    { date: "Feb", price: 15 },
    { date: "Mar", price: 11 },
    { date: "Apr", price: 18 },
    { date: "May", price: 22 },
    { date: "Jun", price: 19 },
  ];

  return (
    <div className={styles.chartWrapper} style={{ opacity: 0.3 }}>
      <p className={styles.mockLabel}>Sample chart (no real data)</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

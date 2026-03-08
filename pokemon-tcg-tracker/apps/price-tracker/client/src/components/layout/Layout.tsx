import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setQuery("");
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoPokeball}>◉</span>
            <span>TCG Tracker</span>
          </Link>

          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search cards…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search cards"
            />
            <button type="submit" className={styles.searchBtn}>
              Search
            </button>
          </form>

          <nav className={styles.nav}>
            <Link to="/" className={styles.navLink}>
              Sets
            </Link>
            <Link to="/search" className={styles.navLink}>
              Browse
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <p>
          Card data from{" "}
          <a
            href="https://github.com/PokemonTCG/pokemon-tcg-data"
            target="_blank"
            rel="noreferrer"
          >
            pokemon-tcg-data
          </a>
          . Not affiliated with Nintendo or The Pokémon Company.
        </p>
      </footer>
    </div>
  );
}

import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { SetBrowserPage } from "./pages/SetBrowserPage";
import { SetDetailPage } from "./pages/SetDetailPage";
import { CardDetailPage } from "./pages/CardDetailPage";
import { SearchPage } from "./pages/SearchPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SetBrowserPage />} />
        <Route path="/sets/:setId" element={<SetDetailPage />} />
        <Route path="/cards/:cardId" element={<CardDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

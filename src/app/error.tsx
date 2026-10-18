"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="site-container content-page">
      <div className="empty">
        <h1>Chưa thể tải nội dung.</h1>
        <p className="muted">Vui lòng thử lại sau ít phút.</p>
        <button className="button" onClick={reset}>
          Thử lại
        </button>
      </div>
    </main>
  );
}

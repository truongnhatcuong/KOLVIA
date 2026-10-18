import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="site-container content-page">
      <div className="empty">
        <p className="eyebrow">404</p>
        <h1>Trang này chưa có ở đây.</h1>
        <p className="muted">Nội dung có thể đã đóng hoặc không được công khai.</p>
        <Link href="/" className="button">
          Về trang chủ ↗
        </Link>
      </div>
    </main>
  );
}

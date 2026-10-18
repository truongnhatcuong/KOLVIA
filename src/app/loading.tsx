export default function Loading() {
  return (
    <main
      id="main-content"
      aria-busy="true"
      aria-label="Đang tải nội dung"
      className="loading-grid"
    >
      {[1, 2, 3].map((i) => (
        <div className="skeleton" key={i} />
      ))}
    </main>
  );
}

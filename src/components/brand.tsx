import Image from "next/image";
import Link from "next/link";

/** Both lockups use the supplied artwork; CSS crops keep its original lettering. */
export function Brand({ full = false }: { full?: boolean }) {
  return (
    <Link
      href="/"
      className={full ? "brand-full" : "brand shrink-0"}
      aria-label="KOLVIA — Trang chủ"
    >
      {full ? (
        <Image
          src="/icon.png"
          width={1254}
          height={1254}
          sizes="176px"
          className="brand-full-image"
          alt="KOLVIA — Kết nối KOL - Mở rộng cơ hội"
        />
      ) : (
        <>
          <span className="brand-symbol" aria-hidden="true">
            <Image src="/icon.png" width={1254} height={1254} sizes="82px" alt="" />
          </span>
          <span className="brand-lockup" aria-hidden="true">
            <span className="brand-wordmark">
              <Image src="/icon.png" width={1254} height={1254} sizes="150px" alt="" />
            </span>
            <small>Kết nối KOL - Mở rộng cơ hội</small>
          </span>
        </>
      )}
    </Link>
  );
}

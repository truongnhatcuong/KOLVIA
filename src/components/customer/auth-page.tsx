import Link from "next/link";
import { Brand } from "@/components/brand";
import { ApiForm, type FormField } from "@/components/ui/api-form";
import { Icon, type IconName } from "@/components/ui/icon";
export function AuthPage({
  register = false,
  defaultRole = "KOL",
  passwordChanged = false,
}: {
  register?: boolean;
  defaultRole?: "KOL" | "ORGANIZER";
  passwordChanged?: boolean;
}) {
  const fields: FormField[] = [
    ...(register
      ? [
          { name: "name", label: "Tên của bạn", required: true, minLength: 2, maxLength: 100 },
          {
            name: "role",
            label: "Bạn tham gia với vai trò",
            type: "select" as const,
            radio: true,
            value: defaultRole,
            options: [
              {
                label: "Tôi là KOL / Creator",
                value: "KOL",
                description: "Khám phá Job sự kiện, ứng tuyển và phản hồi lời mời hợp tác.",
              },
              {
                label: "Nhà tổ chức / Brand",
                value: "ORGANIZER",
                description: "Đăng Job, xét duyệt ứng viên và kết nối với nhà sáng tạo.",
              },
            ],
          },
        ]
      : []),
    {
      name: "email",
      label: "Email",
      type: "email",
      required: true,
      maxLength: 254,
      placeholder: "ban@example.com",
    },
    {
      name: "password",
      label: "Mật khẩu",
      type: "password",
      required: true,
      minLength: register ? 10 : 1,
      maxLength: 128,
      hint: register ? "Sử dụng ít nhất 10 ký tự." : undefined,
    },
  ];
  return (
    <main id="main-content" className="site-container">
      {passwordChanged && <p role="status" className="notice success">Đã đổi mật khẩu thành công. Đăng nhập lại bằng mật khẩu mới.</p>}
      <div className="auth-breadcrumb">
        <Link href="/">Trang chủ</Link>
        <span>›</span>
        <span>Xác thực tài khoản</span>
        <span className="hero-pill">KOLVIA · Kết nối sáng tạo</span>
      </div>
      <div className="auth-page">
        <div className="auth-art">
          <div>
            <Brand full />
            <span className="hero-pill">
              <Icon name="spark" size={16} /> Cộng đồng nhà sáng tạo
            </span>
            <h2>Kết nối nhà tổ chức & KOL hàng đầu</h2>
            <p className="muted">
              Một cộng đồng để bạn tìm cơ hội, gặp đúng người và cùng tạo nên trải nghiệm đáng nhớ.
            </p>
            <div className="auth-benefits">
              {(
                [
                  [
                    "briefcase",
                    "Cơ hội dành cho bạn",
                    "Khám phá sự kiện và chiến dịch trong lĩnh vực bạn yêu thích.",
                  ],
                  [
                    "users",
                    "Kết nối đúng người",
                    "Tìm kiếm nhà sáng tạo và gửi lời mời hợp tác trực tiếp.",
                  ],
                  [
                    "check",
                    "Quản lý trong một nơi",
                    "Theo dõi đơn ứng tuyển, lời mời và các hợp tác đã xác nhận.",
                  ],
                ] as [IconName, string, string][]
              ).map(([icon, title, text]) => (
                <div className="auth-benefit" key={title}>
                  <span className="icon-tile">
                    <Icon name={icon} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p className="muted">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="auth-journey">
            <span>
              <Icon name="profile" /> Tạo hồ sơ
            </span>
            <span>
              <Icon name="search" /> Khám phá
            </span>
            <span>
              <Icon name="check" /> Hợp tác
            </span>
          </div>
        </div>
        <div className="auth-body">
          <div className="auth-heading">
            <h1>{register ? "Tạo tài khoản KOLVIA" : "Chào mừng trở lại"}</h1>
            <nav className="auth-tabs" aria-label="Tài khoản">
              <Link href="/login" className={!register ? "active" : ""}>
                Đăng nhập
              </Link>
              <Link href="/register" className={register ? "active" : ""}>
                Đăng ký
              </Link>
            </nav>
          </div>
          <p className="muted">
            {register
              ? "Tạo tài khoản và bắt đầu câu chuyện của bạn."
              : "Nhập thông tin xác thực để bắt đầu kết nối sự kiện & nhãn hàng."}
          </p>
          {!register && (
            <div className="auth-role-summary">
              <div>
                <span className="icon-tile">
                  <Icon name="profile" />
                </span>
                <strong>KOL / Creator</strong>
                <p>Ứng tuyển Job, xây dựng Portfolio và phản hồi lời mời.</p>
              </div>
              <div>
                <span className="icon-tile">
                  <Icon name="briefcase" />
                </span>
                <strong>Nhà tổ chức / Brand</strong>
                <p>Đăng tin tuyển dụng, tìm KOL và quản lý hợp tác.</p>
              </div>
            </div>
          )}
          <ApiForm
            endpoint={`/api/auth/${register ? "register" : "login"}`}
            fields={fields}
            submitLabel={register ? "Tạo tài khoản" : "Đăng nhập"}
            auth
          />
          <div className="auth-switch">
            {register ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
            <Link href={register ? "/login" : "/register"}>
              {register ? "Đăng nhập" : "Tham gia KOLVIA"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

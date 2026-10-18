import { Icon, type IconName } from "@/components/ui/icon";

const steps: { icon: IconName; title: string; description: string; tags: string[] }[] = [
  { icon: "profile", title: "Tạo hồ sơ của bạn", description: "Giới thiệu bản thân, lĩnh vực sáng tạo và liên kết các kênh nội dung.", tags: ["Hồ sơ", "Kênh nội dung"] },
  { icon: "search", title: "Tìm kiếm cơ hội phù hợp", description: "Khám phá Job hoặc tìm KOL theo lĩnh vực và địa điểm mong muốn.", tags: ["Lĩnh vực", "Địa điểm"] },
  { icon: "check", title: "Kết nối và hợp tác", description: "Ứng tuyển, phản hồi lời mời và theo dõi những hợp tác đã xác nhận.", tags: ["Ứng tuyển", "Xác nhận"] },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="site-container scroll-mt-24 py-20">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <p className="mb-3 inline-flex rounded-full bg-surface-container px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">Cơ chế kết nối</p>
        <h2 className="text-2xl font-bold sm:text-[30px]">Hợp tác dễ dàng với KOLVIA</h2>
        <p className="mt-3 text-xs leading-6 text-muted">Ba bước đơn giản để biến một kết nối thành cơ hội.</p>
      </div>
      <ol className="relative grid gap-6 md:grid-cols-3 md:gap-8">
        <div aria-hidden className="absolute left-[16.66%] right-[16.66%] top-[3.25rem] hidden border-t-2 border-dashed border-primary/25 md:block" />
        {steps.map((step, index) => (
          <li key={step.title} className="group relative flex flex-col items-center rounded-2xl bg-white p-7 pt-9 text-center shadow-sm ring-1 ring-ink/5 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:ring-primary/20">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">Bước 0{index + 1}</span>
            <span className="relative z-10 mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25 ring-8 ring-white transition duration-300 group-hover:scale-105">
              <Icon name={step.icon} size={28} />
            </span>
            <h3 className="text-base font-semibold">{step.title}</h3>
            <p className="mt-3 text-xs leading-6 text-muted">{step.description}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {step.tags.map((tag) => <span key={tag} className="rounded-full bg-surface-low px-3 py-1 text-[10px] font-medium text-primary">{tag}</span>)}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

import { statusLabels, dateLabel } from "@/lib/format";
import type { adminActivity } from "@/services/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
type Activity = Awaited<ReturnType<typeof adminActivity>>;
const channels = [{ key: "jobs", label: "Job mới", color: "#3525cd" }, { key: "applications", label: "Ứng tuyển", color: "#712ae2" }, { key: "connections", label: "Kết nối xác nhận", color: "#006e4b" }] as const;
export function ActivityChart({ data }: { data: Activity }) {
  const max = Math.max(1, ...data.series.flatMap((point) => channels.map(({ key }) => point[key])));
  const y = (value: number) => 195 - value / max * 160;
  const x = (index: number) => 35 + index / Math.max(1, data.series.length - 1) * 690;
  const total = data.moderation.reduce((sum, item) => sum + item.count, 0);
  return <div className="mb-8 grid gap-5 xl:grid-cols-[2fr_1fr]">
    <Card><CardHeader><CardTitle>Hoạt động trong 30 ngày</CardTitle><CardDescription>Job, yêu cầu tham gia và kết nối được xác nhận từ dữ liệu thực tế.</CardDescription></CardHeader><CardContent>
      <div className="mb-4 flex flex-wrap gap-4 text-[10px]">{channels.map((channel) => <span key={channel.key} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: channel.color }} />{channel.label}</span>)}</div>
      <svg viewBox="0 0 760 235" className="w-full" role="img" aria-label="Biểu đồ hoạt động 30 ngày, bảng số liệu đầy đủ bên dưới">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => <g key={ratio}><line x1="35" y1={y(ratio * max)} x2="725" y2={y(ratio * max)} stroke="#e8e6f0" strokeDasharray="4 4" /><text x="25" y={y(ratio * max) + 4} textAnchor="end" fontSize="10" fill="#777587">{Math.ceil(ratio * max)}</text></g>)}
        {channels.map((channel) => <g key={channel.key}><polyline fill="none" stroke={channel.color} strokeWidth="2.5" strokeLinejoin="round" points={data.series.map((point, index) => `${x(index)},${y(point[channel.key])}`).join(" ")} />{data.series.map((point, index) => <circle key={point.day} cx={x(index)} cy={y(point[channel.key])} r="3" fill={channel.color}><title>{dateLabel(point.day)}: {point[channel.key]} {channel.label}</title></circle>)}</g>)}
        {data.series.filter((_, index) => index % 7 === 0 || index === data.series.length - 1).map((point) => <text key={point.day} x={x(data.series.indexOf(point))} y="220" textAnchor="middle" fontSize="10" fill="#777587">{point.day.slice(8)}/{point.day.slice(5, 7)}</text>)}
      </svg>
      <details className="mt-3 text-xs"><summary className="cursor-pointer text-primary">Xem bảng số liệu</summary><div className="table-wrap mt-3 max-h-64 overflow-auto"><table><thead><tr><th>Ngày</th><th>Job mới</th><th>Ứng tuyển</th><th>Kết nối</th></tr></thead><tbody>{data.series.map((point) => <tr key={point.day}><td>{dateLabel(point.day)}</td><td>{point.jobs}</td><td>{point.applications}</td><td>{point.connections}</td></tr>)}</tbody></table></div></details>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Kiểm duyệt Job</CardTitle><CardDescription>{total} Job trên nền tảng</CardDescription></CardHeader><CardContent><div className="space-y-5">{["DRAFT", "PENDING", "APPROVED", "REJECTED"].map((status, index) => { const count = data.moderation.find((item) => item.status === status)?.count ?? 0; return <div key={status}><div className="mb-2 flex justify-between text-xs"><span>{statusLabels[status]}</span><strong>{count}</strong></div><div className="h-2 overflow-hidden rounded-full bg-surface-low"><div className="h-full rounded-full" style={{ width: `${total ? count / total * 100 : 0}%`, background: ["#777587", "#712ae2", "#006e4b", "#ba1a1a"][index] }} /></div></div>; })}</div></CardContent></Card>
  </div>;
}

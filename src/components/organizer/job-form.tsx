import type { Job } from "@prisma/client";
import { categories } from "@/types";
import { ApiForm } from "@/components/ui/api-form";
function localDate(value?: Date) {
  if (!value) return "";
  return new Date(value.getTime() + 7 * 60 * 60000).toISOString().slice(0, 16);
}
export function JobForm({ job }: { job?: Job }) {
  return (
    <ApiForm
      endpoint={job ? `/api/jobs/${job.id}` : "/api/jobs"}
      method={job ? "PATCH" : "POST"}
      submitLabel={job ? "Lưu thay đổi" : "Tạo bản nháp"}
      redirectTo="/organizer/jobs/[id]"
      steps={
        job
          ? undefined
          : [
              { title: "Thông tin chung", fields: ["title", "category", "location"] },
              { title: "Mô tả & yêu cầu", fields: ["description", "requirements", "benefits"] },
              {
                title: "Lịch & ngân sách",
                fields: ["budgetMin", "budgetMax", "capacity", "deadline", "eventDate"],
              },
              { title: "Xem lại", fields: [] },
            ]
      }
      fields={[
        {
          name: "title",
          label: "Tên Job",
          required: true,
          value: job?.title,
          minLength: 5,
          maxLength: 150,
        },
        {
          name: "description",
          label: "Mô tả cơ hội",
          type: "textarea",
          required: true,
          value: job?.description,
          minLength: 20,
          maxLength: 10000,
        },
        {
          name: "requirements",
          label: "Yêu cầu với KOL",
          type: "textarea",
          required: true,
          value: job?.requirements,
          minLength: 10,
          maxLength: 5000,
        },
        { name: "benefits", label: "Quyền lợi dành cho KOL", type: "textarea", required: true, value: job?.benefits, minLength: 10, maxLength: 5000, placeholder: "Thù lao, sản phẩm trải nghiệm, chi phí di chuyển và quyền lợi khác…" },
        { name: "capacity", label: "Số lượng KOL cần tuyển", type: "number", required: true, min: 1, max: 1000, value: job?.capacity ?? 10 },
        {
          name: "category",
          label: "Lĩnh vực",
          type: "select",
          value: job?.category,
          options: categories.map((c) => ({ label: c, value: c })),
        },
        {
          name: "location",
          label: "Địa điểm",
          required: true,
          value: job?.location,
          minLength: 2,
          maxLength: 150,
        },
        {
          name: "budgetMin",
          label: "Ngân sách tối thiểu (VNĐ)",
          type: "number",
          required: true,
          min: 0,
          max: 1000000000,
          value: job?.budgetMin,
        },
        {
          name: "budgetMax",
          label: "Ngân sách tối đa (VNĐ)",
          type: "number",
          required: true,
          min: 0,
          max: 1000000000,
          value: job?.budgetMax,
        },
        {
          name: "deadline",
          label: "Hạn ứng tuyển",
          type: "datetime-local",
          required: true,
          value: localDate(job?.deadline),
          hint: "Giờ Việt Nam (UTC+7).",
        },
        {
          name: "eventDate",
          label: "Thời gian sự kiện",
          type: "datetime-local",
          required: true,
          value: localDate(job?.eventDate),
          hint: "Giờ Việt Nam (UTC+7).",
        },
      ]}
    />
  );
}

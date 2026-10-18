import { notFound } from "next/navigation";
import { pageActor } from "@/lib/permissions/guards";
import { ownJob } from "@/services/jobs";
import { AppError } from "@/lib/errors";
import { PageHeading } from "@/components/ui";
import { JobForm } from "@/components/organizer/job-form";
import { ownMedia } from "@/services/media";
import { ImageUpload } from "@/components/ui/image-upload";
export const metadata = { title: "Sửa Job" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const actor = await pageActor("ORGANIZER");
  const { id } = await params;
  const job = await ownJob(actor, id).catch((error) => {
    if (error instanceof AppError && [403, 404].includes(error.status)) notFound();
    throw error;
  });
  if (["ARCHIVED", "COMPLETED"].includes(job.status) || job.completedAt) notFound();
  const media = await ownMedia(actor, id);
  return (
    <>
      <PageHeading
        title="Cập nhật cơ hội của bạn."
        description="Nội dung Job đã gửi hoặc duyệt khi thay đổi sẽ được kiểm duyệt lại."
      />
      <div className="panel form-panel">
        <ImageUpload
          input={{ target: "JOB_COVER", jobId: id }}
          label="Ảnh bìa Job"
          assets={media}
          enabled={Boolean(process.env.UPLOADTHING_TOKEN)}
        />
        <JobForm job={job} />
      </div>
    </>
  );
}

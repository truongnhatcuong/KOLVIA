"use client";

export function JobMatchSelect({ jobs, value }: { jobs: { id: string; title: string }[]; value: string }) {
  return <select name="matchJob" id="matching-job" defaultValue={value} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="">Xem tất cả KOL · không đối chiếu</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select>;
}

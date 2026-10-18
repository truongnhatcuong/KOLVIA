import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { publicJobs } from "@/lib/db/queries";
import { createJob, ownJobs } from "@/services/jobs";
export const GET = api(async (r) =>
  new URL(r.url).searchParams.get("scope") === "mine"
    ? ownJobs(await currentActor())
    : publicJobs(Object.fromEntries(new URL(r.url).searchParams)),
);
export const POST = api(async (r) => createJob(await currentActor(), await jsonBody(r)), true);

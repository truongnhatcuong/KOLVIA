import { api, jsonBody } from "@/lib/http";
import { currentActor } from "@/lib/auth/session";
import { readNotification } from "@/services/notifications";
import { notificationActionSchema } from "@/lib/validations";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return api(async (r) => {
    notificationActionSchema.parse(await jsonBody(r));
    return readNotification(await currentActor(), id);
  }, true)(request);
}

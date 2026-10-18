/** Shared chatbot API contract. Keep this module independent of backend services. */
export interface AssistantCard {
  title: string;
  href: string;
  detail: string;
  score?: number;
}

export interface AssistantJobChoice {
  jobId: string;
  title: string;
  detail: string;
}

export interface AssistantAnswer {
  message: string;
  cards: AssistantCard[];
  tools: string[];
  retrievedAt: string;
  /** Absent: preserve current choices. Empty array: clear current choices. */
  jobChoices?: AssistantJobChoice[];
  selectedJobId?: string;
  contextToken?: string;
}

export interface AssistantHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  history?: AssistantHistoryMessage[];
  contextToken?: string;
  action?: { type: "select_job"; jobId: string };
}

export type AssistantChatResponse =
  | { data: AssistantAnswer }
  | { error: string; fields?: Record<string, string[] | undefined> };

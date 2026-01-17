export interface ErrorMapping {
  title: string;
  message: string;
  action?: string;
  actionRoute?: string;
}

const ERROR_MAP: Record<string, ErrorMapping> = {
  REASON_CODE_REQUIRED: {
    title: "Archive Reason Required",
    message: "Select an archive reason to close the case.",
  },
  CASE_NOT_FOUND: {
    title: "Case Not Found",
    message: "This case no longer exists or you don't have access.",
    action: "Return to Cases",
    actionRoute: "/",
  },
  ARCHIVED_RESOURCE_IMMUTABLE: {
    title: "Case is Archived",
    message: "This case is archived and cannot be edited. View records in read-only mode.",
  },
  ALREADY_ARCHIVED: {
    title: "Already Archived",
    message: "This case is already archived.",
  },
  DELETE_NOT_ALLOWED: {
    title: "Deletion Not Allowed",
    message: "Cases cannot be deleted. Use the Close Case option to archive instead.",
  },
  EVALUATION_BLOCKED: {
    title: "Evaluation Blocked",
    message: "Cannot run evaluation - missing prerequisites. Check the Overview tab for details.",
    action: "View Requirements",
  },
  PRINTOUT_NOT_ALLOWED: {
    title: "Printout Not Allowed",
    message: "Cannot issue a printout without a completed evaluation.",
    action: "Run Evaluation First",
  },
  DECISION_TARGET_REQUIRED: {
    title: "Decision Target Required",
    message: "Set a decision target before proceeding.",
  },
  "No decision target defined": {
    title: "Decision Target Required",
    message: "Set a decision target before running evaluation.",
    action: "Set Target",
  },
  DOCUMENT_NOT_FOUND: {
    title: "Document Not Found",
    message: "The requested document could not be found.",
  },
  INVALID_DECISION_TIME: {
    title: "Invalid Decision Time",
    message: "The decision time must be in the past.",
  },
  "Decision time not set": {
    title: "Decision Time Required",
    message: "Set the decision time before running evaluation.",
    action: "Set Decision Time",
  },
  "Documents missing content hash": {
    title: "Documents Need Processing",
    message: "Some documents haven't been fully processed. Please re-upload them.",
    action: "Review Documents",
  },
  "Failed to create determination": {
    title: "Evaluation Failed",
    message: "Could not save the evaluation. Please try again.",
  },
  NO_DETERMINATION_FOR_PRINTOUT: {
    title: "No Determination Available",
    message: "Run an evaluation first to create a determination, then issue a printout.",
    action: "Go to Evaluate",
  },
  ARCHIVE_FAILED: {
    title: "Archive Failed",
    message: "Unable to archive the case. Please try again.",
  },
  VALIDATION_ERROR: {
    title: "Validation Error",
    message: "The submitted data is invalid. Please check your inputs.",
  },
};

const FALLBACK_ERROR: ErrorMapping = {
  title: "Something Went Wrong",
  message: "An unexpected error occurred. Please try again or contact support.",
};

export function mapApiError(errorCode: string | undefined): ErrorMapping {
  if (!errorCode) return FALLBACK_ERROR;
  return ERROR_MAP[errorCode] || FALLBACK_ERROR;
}

export function getErrorFromResponse(response: any): ErrorMapping {
  if (typeof response === "object" && response !== null) {
    if (response.error && typeof response.error === "string") {
      return mapApiError(response.error);
    }
    if (response.message && typeof response.message === "string") {
      return { title: "Error", message: response.message };
    }
  }
  return FALLBACK_ERROR;
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const errorInfo = getErrorFromResponse(data);
    const error = new ApiError(errorInfo.message, response.status, data.error);
    throw error;
  }
  return response.json();
}

export class ApiError extends Error {
  status: number;
  code?: string;
  
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
  
  get mapping(): ErrorMapping {
    return mapApiError(this.code);
  }
}

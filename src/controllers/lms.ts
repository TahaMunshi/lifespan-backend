import { Request, Response } from "express";
import { tryCatch } from "../utils/tryCatch";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { filterStateForLearner } from "../lms/domain";
import * as lms from "../lms/store";

function isAdmin(req: any) {
  return req.user?.role === "admin";
}

function clientIdOf(req: Request) {
  return String(req.header("X-Learner-Client") || req.body?.clientId || "").trim();
}

function requireClientId(req: Request) {
  const clientId = clientIdOf(req);
  if (!clientId) throw new ApiError(400, "Missing learner client id");
  return clientId;
}

function unwrap(payload: { result: any; state: any }, isAdminUser: boolean, clientId: string) {
  const state = isAdminUser ? payload.state : filterStateForLearner(payload.state, clientId);
  return { ...((payload.result && typeof payload.result === "object") ? payload.result : { result: payload.result }), state };
}

export const getState = tryCatch(async (req: any, res: Response) => {
  const clientId = clientIdOf(req);
  const state = await lms.getLmsState(isAdmin(req), clientId);
  return ApiResponse(res, "LMS state loaded", { state, user: req.user || null });
});

export const savePublication = tryCatch(async (req: any, res: Response) => {
  const payload = await lms.savePublication(req.body);
  if (payload.result?.ok === false) throw new ApiError(400, payload.result.errors.join(" "), payload.result.errors);
  return ApiResponse(res, "Publication saved", unwrap(payload, true, ""));
});

export const duplicatePublication = tryCatch(async (req: any, res: Response) => {
  const payload = await lms.duplicatePublication(req.params.id);
  if (!payload.result) throw new ApiError(404, "Activity not found");
  return ApiResponse(res, "Activity duplicated", unwrap(payload, true, ""));
});

export const togglePublication = tryCatch(async (req: any, res: Response) => {
  const payload = await lms.togglePublication(req.params.id);
  if (payload.result?.ok === false) throw new ApiError(400, payload.result.errors.join(" "), payload.result.errors);
  return ApiResponse(res, "Publication updated", unwrap(payload, true, ""));
});

export const upsertCatalog = tryCatch(async (req: any, res: Response) => {
  const payload = await lms.upsertActivityCatalog(req.body);
  return ApiResponse(res, "Catalog saved", unwrap(payload, true, ""));
});

export const createEvaluationTemplate = tryCatch(async (req: any, res: Response) => {
  const payload = await lms.createEvaluationTemplate(req.body?.name);
  return ApiResponse(res, "Evaluation created", unwrap(payload, true, ""));
});

export const saveEvaluationTemplate = tryCatch(async (req: any, res: Response) => {
  const payload = await lms.saveEvaluationTemplate(req.params.id, req.body);
  if (payload.result?.ok === false) throw new ApiError(400, payload.result.errors.join(" "), payload.result.errors);
  return ApiResponse(res, "Evaluation saved", unwrap(payload, true, ""));
});

export const duplicateEvaluationTemplate = tryCatch(async (req: any, res: Response) => {
  const payload = await lms.duplicateEvaluationTemplate(req.params.id, req.body?.name);
  if (!payload.result) throw new ApiError(404, "Template not found");
  return ApiResponse(res, "Evaluation duplicated", unwrap(payload, true, ""));
});

export const createTestTemplate = tryCatch(async (req: any, res: Response) => {
  const payload = await lms.createTestTemplate(req.body?.name);
  return ApiResponse(res, "Knowledge check created", unwrap(payload, true, ""));
});

export const saveTestTemplate = tryCatch(async (req: any, res: Response) => {
  const payload = await lms.saveTestTemplate(req.params.id, req.body);
  if (payload.result?.ok === false) throw new ApiError(400, payload.result.errors.join(" "), payload.result.errors);
  return ApiResponse(res, "Knowledge check saved", unwrap(payload, true, ""));
});

export const duplicateTestTemplate = tryCatch(async (req: any, res: Response) => {
  const payload = await lms.duplicateTestTemplate(req.params.id);
  if (!payload.result) throw new ApiError(404, "Knowledge check not found");
  return ApiResponse(res, "Knowledge check duplicated", unwrap(payload, true, ""));
});

export const saveDraft = tryCatch(async (req: any, res: Response) => {
  const clientId = requireClientId(req);
  const payload = await lms.saveDraft(req.params.publicationId, req.body, clientId);
  return ApiResponse(res, "Draft saved", unwrap(payload, false, clientId));
});

export const submitEvaluation = tryCatch(async (req: any, res: Response) => {
  const clientId = requireClientId(req);
  const payload = await lms.submitEvaluation(req.params.publicationId, req.body, clientId);
  return ApiResponse(res, "Evaluation submitted", unwrap(payload, false, clientId));
});

export const recordAttempt = tryCatch(async (req: any, res: Response) => {
  const clientId = requireClientId(req);
  const { result, answers } = req.body;
  const payload = await lms.recordAttempt(req.params.publicationId, result, answers, clientId);
  return ApiResponse(res, "Attempt recorded", unwrap(payload, false, clientId));
});

export const confirmAttendance = tryCatch(async (req: any, res: Response) => {
  const clientId = requireClientId(req);
  const payload = await lms.confirmAttendance(req.params.publicationId, clientId);
  return ApiResponse(res, "Attendance confirmed", unwrap(payload, false, clientId));
});

export const issueCertificate = tryCatch(async (req: any, res: Response) => {
  const clientId = requireClientId(req);
  const payload = await lms.issueCertificate(req.params.publicationId, req.body?.learner, clientId);
  return ApiResponse(res, "Certificate issued", unwrap(payload, false, clientId));
});

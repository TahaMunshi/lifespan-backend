import { Router } from "express";
import { AllowOnly } from "../middlewares/allowOnly";
import { optionalJWT } from "../middlewares/optionalAuth";
import {
  confirmAttendance,
  createEvaluationTemplate,
  createTestTemplate,
  duplicateEvaluationTemplate,
  duplicatePublication,
  duplicateTestTemplate,
  getState,
  issueCertificate,
  recordAttempt,
  saveDraft,
  saveEvaluationTemplate,
  savePublication,
  saveTestTemplate,
  submitEvaluation,
  togglePublication,
  upsertCatalog,
} from "../controllers/lms";

const lmsRouter = Router();

lmsRouter.get("/state", optionalJWT, getState);

lmsRouter.post("/publications", AllowOnly("admin"), savePublication);
lmsRouter.post("/publications/:id/duplicate", AllowOnly("admin"), duplicatePublication);
lmsRouter.post("/publications/:id/toggle", AllowOnly("admin"), togglePublication);
lmsRouter.post("/catalog", AllowOnly("admin"), upsertCatalog);

lmsRouter.post("/evaluations", AllowOnly("admin"), createEvaluationTemplate);
lmsRouter.post("/evaluations/:id", AllowOnly("admin"), saveEvaluationTemplate);
lmsRouter.post("/evaluations/:id/duplicate", AllowOnly("admin"), duplicateEvaluationTemplate);

lmsRouter.post("/tests", AllowOnly("admin"), createTestTemplate);
lmsRouter.post("/tests/:id", AllowOnly("admin"), saveTestTemplate);
lmsRouter.post("/tests/:id/duplicate", AllowOnly("admin"), duplicateTestTemplate);

lmsRouter.post("/drafts/:publicationId", saveDraft);
lmsRouter.post("/submissions/:publicationId", submitEvaluation);
lmsRouter.post("/attempts/:publicationId", recordAttempt);
lmsRouter.post("/attendance/:publicationId", confirmAttendance);
lmsRouter.post("/certificates/:publicationId", issueCertificate);

export { lmsRouter };

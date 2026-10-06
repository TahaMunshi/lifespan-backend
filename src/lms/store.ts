import { LmsWorkspace } from "../models/lmsWorkspace";
import { User } from "../models/user";
import { createEmptyLmsState } from "./seed";
import { cloneStandardSections } from "./questions";
import {
  activityContext,
  draftKey,
  filterStateForLearner,
  makePublicationSnapshot,
  safeSlug,
  uid,
  validatePublication,
} from "./domain";

let queue: Promise<any> = Promise.resolve();

function ensureEvaluationSections(template: any) {
  if (!template.sections) template.sections = cloneStandardSections();
  return template;
}

async function loadDoc() {
  let doc = await LmsWorkspace.findOne({ key: "default" });
  if (!doc) {
    doc = await LmsWorkspace.create({ key: "default", state: createEmptyLmsState() });
  }
  const state = doc.state || createEmptyLmsState();
  state.schemaVersion = 6;
  state.templates ||= { evaluations: [], tests: [], certificates: [] };
  state.templates.evaluations ||= [];
  state.templates.tests ||= [];
  state.templates.certificates ||= [];
  state.courses ||= [];
  state.versions ||= [];
  state.cohorts ||= [];
  state.modules ||= [];
  state.publications ||= [];
  state.submissions ||= [];
  state.attempts ||= [];
  state.attendanceConfirmations ||= [];
  state.certificates ||= [];
  state.drafts ||= {};
  (state.templates.evaluations || []).forEach(ensureEvaluationSections);
  doc.state = state;
  return doc;
}

function withWorkspace<T>(fn: (state: any) => T | Promise<T>) {
  const run = queue.then(async () => {
    const doc = await loadDoc();
    const result = await fn(doc.state);
    doc.markModified("state");
    await doc.save();
    return { result, state: doc.state };
  });
  queue = run.then(() => undefined, () => undefined);
  return run;
}

function uniqueSlug(state: any, candidate: string, ignoreId: string | null = null) {
  const base = safeSlug(candidate) || "activity";
  let slug = base;
  let suffix = 2;
  while (state.publications.some((item: any) => item.id !== ignoreId && item.slug === slug)) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

export async function bootstrapLms() {
  const email = (process.env.ADMIN_EMAIL || "admin@lifespanlearning.org").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "LifespanAdmin2026!";
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({
      fullName: "Lifespan Admin",
      email,
      password,
      role: "admin",
      isActive: true,
    });
    console.log(`Seeded admin user: ${email}`);
  }
  await loadDoc();
}

export async function getLmsState(isAdmin: boolean, clientId: string) {
  const doc = await loadDoc();
  if (isAdmin) return doc.state;
  return filterStateForLearner(doc.state, clientId);
}

export function savePublication(input: any) {
  return withWorkspace((state) => {
    const existing = state.publications.find((item: any) => item.id === input.id);
    const next = {
      ...(existing || {}),
      ...input,
      id: input.id || uid("pub"),
      slug: uniqueSlug(state, input.slug || input.name || "activity", input.id || null),
      status: input.status || existing?.status || "draft",
      revision: existing ? existing.revision + 1 : 1,
      createdAt: existing?.createdAt || new Date().toISOString(),
      publishedAt: existing?.publishedAt || null,
    };
    const errors = validatePublication(state, next);
    if (errors.length) return { ok: false, errors };
    if (existing) {
      state.publications = state.publications.map((item: any) => item.id === next.id ? next : item);
    } else {
      state.publications.push(next);
    }
    return { ok: true, publication: next };
  });
}

export function duplicatePublication(publicationId: string) {
  return withWorkspace((state) => {
    const source = state.publications.find((item: any) => item.id === publicationId);
    if (!source) return null;
    const course = state.courses.find((item: any) => item.id === source.courseId);
    const duplicate = {
      ...structuredClone(source),
      id: uid("pub"),
      slug: uniqueSlug(state, `${source.slug}-copy`),
      status: "draft",
      revision: 1,
      createdAt: new Date().toISOString(),
      publishedAt: null,
      duplicatedFrom: source.id,
    };
    state.publications.push(duplicate);
    return { ...duplicate, displayName: `${course?.name || "Activity"} — Copy` };
  });
}

export function createEvaluationTemplate(name = "Activity Evaluation") {
  return withWorkspace((state) => {
    const template = {
      id: uid("eval"),
      name,
      version: 1,
      status: "draft",
      dynamicSections: ["objectives", "presenters", "activity"],
      sections: cloneStandardSections(),
    };
    state.templates.evaluations.push(template);
    return template;
  });
}

export function duplicateEvaluationTemplate(templateId: string, name?: string) {
  return withWorkspace((state) => {
    const source = state.templates.evaluations.find((item: any) => item.id === templateId);
    if (!source) return null;
    ensureEvaluationSections(source);
    const duplicate = {
      ...structuredClone(source),
      id: uid("eval"),
      name: name || `${source.name} — Copy`,
      version: 1,
      status: "draft",
      duplicatedFrom: source.id,
    };
    state.templates.evaluations.push(duplicate);
    return duplicate;
  });
}

export function upsertActivityCatalog(input: any = {}) {
  return withWorkspace((state) => {
    const name = String(input.name || "").trim() || "Untitled activity";
    const activityType = input.activityType || "live";
    const location = String(input.location || "").trim() || "TBD";
    const presenters = Array.isArray(input.presenters) ? input.presenters.filter(Boolean) : [];
    const creditHours = Number(input.creditHours) || 6;
    const startDate = input.startDate || "";
    const endDate = input.endDate || "";
    const typeLabel = activityType === "home-study" ? "Home Study" : activityType === "hybrid" ? "Hybrid" : "Live";

    let course = state.courses.find((item: any) => item.id === input.courseId);
    if (!course) {
      course = { id: uid("course"), name };
      state.courses.push(course);
    } else {
      course.name = name;
    }

    let version = state.versions.find((item: any) => item.id === input.versionId);
    if (!version) {
      version = { id: uid("version"), courseId: course.id, name: typeLabel, activityType };
      state.versions.push(version);
    } else {
      version.courseId = course.id;
      version.name = typeLabel;
      version.activityType = activityType;
    }

    let cohort = state.cohorts.find((item: any) => item.id === input.cohortId);
    if (!cohort) {
      cohort = {
        id: uid("cohort"),
        versionId: version.id,
        name: startDate ? new Date(`${startDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Cohort",
        location,
        startDate,
        endDate,
        presenters: presenters.length ? presenters : ["Presenter"],
      };
      state.cohorts.push(cohort);
    } else {
      cohort.versionId = version.id;
      cohort.location = location;
      cohort.startDate = startDate;
      cohort.endDate = endDate;
      cohort.presenters = presenters.length ? presenters : cohort.presenters;
      if (startDate) {
        cohort.name = new Date(`${startDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      }
    }

    let module = state.modules.find((item: any) => item.id === input.moduleId);
    if (!module) {
      module = {
        id: uid("module"),
        cohortId: cohort.id,
        name: typeLabel,
        creditHours,
        startDate,
        endDate,
      };
      state.modules.push(module);
    } else {
      module.cohortId = cohort.id;
      module.name = typeLabel;
      module.creditHours = creditHours;
      module.startDate = startDate;
      module.endDate = endDate;
    }

    return {
      courseId: course.id,
      versionId: version.id,
      cohortId: cohort.id,
      moduleId: module.id,
    };
  });
}

export function saveEvaluationTemplate(templateId: string, input: any) {
  return withWorkspace((state) => {
    const template = state.templates.evaluations.find((item: any) => item.id === templateId);
    if (!template) return { ok: false, errors: ["Evaluation template not found."] };
    ensureEvaluationSections(template);
    if (input.name?.trim()) template.name = input.name.trim();
    if (input.sections) template.sections = input.sections;
    template.version = (template.version || 1) + 1;
    template.status = template.status || "active";
    return { ok: true, template };
  });
}

export function saveTestTemplate(templateId: string, input: any) {
  return withWorkspace((state) => {
    const template = state.templates.tests.find((item: any) => item.id === templateId);
    if (!template) return { ok: false, errors: ["Test template not found."] };
    if (input.name?.trim()) template.name = input.name.trim();
    if (input.passPercent != null) template.passPercent = Number(input.passPercent);
    if (input.maxAttempts != null) template.maxAttempts = Number(input.maxAttempts);
    if (Array.isArray(input.questions)) template.questions = input.questions;
    template.version = (template.version || 1) + 1;
    return { ok: true, template };
  });
}

export function createTestTemplate(name = "New Knowledge Check") {
  return withWorkspace((state) => {
    const template = {
      id: uid("test"),
      name,
      version: 1,
      passPercent: 80,
      maxAttempts: 3,
      minimumQuestions: 12,
      questions: [],
    };
    state.templates.tests.push(template);
    return template;
  });
}

export function duplicateTestTemplate(templateId: string) {
  return withWorkspace((state) => {
    const source = state.templates.tests.find((item: any) => item.id === templateId);
    if (!source) return null;
    const duplicate = {
      ...structuredClone(source),
      id: uid("test"),
      name: `${source.name} — Copy`,
      version: 1,
      duplicatedFrom: source.id,
    };
    state.templates.tests.push(duplicate);
    return duplicate;
  });
}

export function togglePublication(publicationId: string) {
  return withWorkspace((state) => {
    const publication = state.publications.find((item: any) => item.id === publicationId);
    if (!publication) return { ok: false, errors: ["Activity not found."] };
    if (publication.status !== "published") {
      const errors = validatePublication(state, publication);
      if (errors.length) return { ok: false, errors };
      publication.status = "published";
      publication.publishedAt = new Date().toISOString();
    } else {
      publication.status = "draft";
    }
    return { ok: true, publication };
  });
}

export function saveDraft(publicationId: string, draft: any, clientId: string) {
  return withWorkspace((state) => {
    const key = draftKey(clientId, publicationId);
    state.drafts[key] = {
      ...(state.drafts[key] || {}),
      ...draft,
      clientId,
      publicationId,
      updatedAt: new Date().toISOString(),
    };
    return state.drafts[key];
  });
}

export function submitEvaluation(publicationId: string, response: any, clientId: string) {
  return withWorkspace((state) => {
    const snapshot = makePublicationSnapshot(state, publicationId);
    const submission = {
      id: uid("submission"),
      publicationId,
      publicationRevision: snapshot?.revision || 1,
      submittedAt: new Date().toISOString(),
      clientId,
      ...response,
      snapshot,
    };
    state.submissions.push(submission);
    delete state.drafts[draftKey(clientId, publicationId)];
    return submission;
  });
}

export function recordAttempt(publicationId: string, result: any, answers: any, clientId: string) {
  return withWorkspace((state) => {
    const attempt = {
      id: uid("attempt"),
      publicationId,
      clientId,
      attemptNumber: state.attempts.filter((item: any) => item.publicationId === publicationId && item.clientId === clientId).length + 1,
      completedAt: new Date().toISOString(),
      ...result,
      answers,
    };
    state.attempts.push(attempt);
    return attempt;
  });
}

export function confirmAttendance(publicationId: string, clientId: string) {
  return withWorkspace((state) => {
    const existing = (state.attendanceConfirmations || [])
      .find((item: any) => item.publicationId === publicationId && item.clientId === clientId);
    if (existing) return existing;
    const confirmation = {
      id: uid("attendance"),
      publicationId,
      clientId,
      confirmedAt: new Date().toISOString(),
    };
    state.attendanceConfirmations ||= [];
    state.attendanceConfirmations.push(confirmation);
    return confirmation;
  });
}

export function issueCertificate(publicationId: string, learner: any, clientId: string) {
  return withWorkspace((state) => {
    const existing = state.certificates.find((item: any) => item.publicationId === publicationId && item.clientId === clientId);
    if (existing) return existing;
    const context = activityContext(state, publicationId);
    const certificate = {
      id: uid("certificate"),
      number: `LLI-${new Date().getFullYear()}-${String(state.certificates.length + 4182).padStart(6, "0")}`,
      publicationId,
      clientId,
      issuedAt: new Date().toISOString(),
      learner,
      snapshot: makePublicationSnapshot(state, publicationId),
      templateId: context?.publication.certificateTemplateId,
    };
    state.certificates.push(certificate);
    return certificate;
  });
}

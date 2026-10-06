export const ACTIVITY_TYPES: Record<string, { label: string; requiresTest: boolean; certificateTemplate: string }> = {
  live: { label: "Live", requiresTest: false, certificateTemplate: "cert-live-v1" },
  "home-study": { label: "Home Study", requiresTest: true, certificateTemplate: "cert-study-v1" },
  hybrid: { label: "Hybrid", requiresTest: true, certificateTemplate: "cert-study-v1" },
};

export function byId(items: any[] | undefined, id: string) {
  return (items || []).find((item) => item.id === id);
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function safeSlug(value: string) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function activityContext(state: any, publicationOrId: any) {
  const publication = typeof publicationOrId === "string"
    ? byId(state.publications, publicationOrId)
    : publicationOrId;
  if (!publication) return null;
  const sourceCohort = byId(state.cohorts, publication.cohortId);
  const sourceModule = byId(state.modules, publication.moduleId);
  const cohort = sourceCohort ? {
    ...sourceCohort,
    name: publication.cohortName || sourceCohort.name,
    location: publication.location || sourceCohort.location,
    presenters: publication.presenters || sourceCohort.presenters,
  } : null;
  const module = sourceModule ? {
    ...sourceModule,
    name: publication.moduleName || sourceModule.name,
    creditHours: Number(publication.creditHours ?? sourceModule.creditHours),
    startDate: publication.startDate || sourceModule.startDate,
    endDate: publication.endDate || sourceModule.endDate,
  } : null;

  return {
    publication,
    course: byId(state.courses, publication.courseId),
    version: byId(state.versions, publication.versionId),
    cohort,
    module,
    evaluationTemplate: byId(state.templates.evaluations, publication.evaluationTemplateId),
    testTemplate: byId(state.templates.tests, publication.testTemplateId),
    certificateTemplate: byId(state.templates.certificates, publication.certificateTemplateId),
  };
}

export function validatePublication(state: any, publication: any) {
  const errors: string[] = [];
  const context = activityContext(state, publication);
  if (!context?.course) errors.push("Select a course.");
  if (!context?.version) errors.push("Select a version.");
  if (!context?.cohort) errors.push("Select a cohort.");
  if (!context?.module) errors.push("Select a module.");
  if (!publication.evaluationTemplateId) errors.push("Select an evaluation template.");
  if (!publication.deadline) errors.push("Set a completion deadline.");

  const type = ACTIVITY_TYPES[publication.activityType];
  if (!type) errors.push("Select a valid activity type.");
  if (type?.requiresTest) {
    const test = byId(state.templates.tests, publication.testTemplateId);
    if (!test) errors.push("Select a test template.");
    if (test && test.questions.length < 12) errors.push("Home Study and Hybrid tests require at least 12 questions.");
    if (test) {
      const objectives = (publication.objectives || []).filter(Boolean);
      const coveredSlots = Math.max(0, ...test.questions.map((question: any) => Number(question.objectiveIndex))) + 1;
      const uncovered = objectives.slice(0, coveredSlots).filter((_: any, objectiveIndex: number) => (
        test.questions.filter((question: any) => Number(question.objectiveIndex) === objectiveIndex).length < 3
      ));
      if (uncovered.length) errors.push("Tests require at least three questions for every learning objective.");
    }
  }
  return errors;
}

export function makePublicationSnapshot(state: any, publicationId: string) {
  const context = activityContext(state, publicationId);
  if (!context) return null;
  return {
    publicationId,
    revision: context.publication.revision,
    activityType: context.publication.activityType,
    courseName: context.course?.name || "",
    versionName: context.version?.name || "",
    cohortName: context.cohort?.name || "",
    moduleName: context.module?.name || "",
    presenters: [...(context.cohort?.presenters || [])],
    location: context.cohort?.location || "",
    creditHours: context.module?.creditHours || 0,
    activityDates: [context.module?.startDate, context.module?.endDate],
    objectives: [...(context.publication.objectives || [])],
    cosponsor: context.publication.cosponsor || "Sensorimotor Psychotherapy Institute",
    certificateTemplateId: context.publication.certificateTemplateId,
  };
}

export function draftKey(clientId: string, publicationId: string) {
  return `${clientId}:${publicationId}`;
}

export function filterStateForLearner(state: any, clientId: string) {
  const mine = (item: any) => item.clientId === clientId;
  const published = (state.publications || []).filter((item: any) => item.status === "published");
  const drafts: Record<string, any> = {};
  Object.entries(state.drafts || {}).forEach(([key, value]: [string, any]) => {
    if (value?.clientId === clientId) {
      drafts[value.publicationId || key.split(":")[1]] = value;
    }
  });
  return {
    ...state,
    publications: published,
    submissions: (state.submissions || []).filter(mine),
    attempts: (state.attempts || []).filter(mine),
    attendanceConfirmations: (state.attendanceConfirmations || []).filter(mine),
    certificates: (state.certificates || []).filter(mine),
    drafts,
  };
}

import { cloneStandardSections } from "./questions";

export function createEmptyLmsState() {
  return {
    schemaVersion: 6,
    templates: {
      evaluations: [
        {
          id: "eval-standard-v1",
          name: "Standard CE Evaluation",
          version: 1,
          status: "active",
          dynamicSections: ["objectives", "presenters", "activity"],
          sections: cloneStandardSections(),
        },
      ],
      tests: [
        {
          id: "test-standard-v1",
          name: "Standard Knowledge Check",
          version: 1,
          passPercent: 80,
          maxAttempts: 3,
          minimumQuestions: 12,
          questions: [],
        },
      ],
      certificates: [
        { id: "cert-live-v1", name: "Live Program Certificate", version: 2, activityTypes: ["live"] },
        { id: "cert-study-v1", name: "Home Study & Hybrid Certificate", version: 2, activityTypes: ["home-study", "hybrid"] },
      ],
    },
    courses: [],
    versions: [],
    cohorts: [],
    modules: [],
    publications: [],
    submissions: [],
    attempts: [],
    attendanceConfirmations: [],
    certificates: [],
    drafts: {},
  };
}

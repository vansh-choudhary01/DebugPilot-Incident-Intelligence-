export type RootCauseAnalysis = {
  whatHappened: string;
  likelyRootCause: string;
  filesToInspect: string[];
  suggestedFixes: string[];
  confidenceScore: number;
};

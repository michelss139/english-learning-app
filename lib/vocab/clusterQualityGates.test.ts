/**
 * Simple unit-like checks for clusterQualityGates helpers.
 * Can be run manually with ts-node or plain node after transpilation.
 */

import { tokenizeWords, evaluateExample } from "./clusterQualityGates";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runClusterQualityGatesTests() {
  console.log("Running clusterQualityGates tests...");

  // tokenizeWords
  assert(
    JSON.stringify(tokenizeWords("The company plans to ____ new employees next month.")) ===
      JSON.stringify(["the", "company", "plans", "to", "new", "employees", "next", "month"]),
    "tokenizeWords failed basic tokenization"
  );

  // evaluateExample: ok case
  const okRes = evaluateExample(
    "The company plans to hire new employees next month.",
    "hire",
    ["rent"]
  );
  assert(okRes.ok, "evaluateExample should accept valid hire example");

  // short
  const shortRes = evaluateExample("hire now", "hire", []);
  assert(!shortRes.ok && shortRes.reasons.includes("short"), "short example should be rejected");

  // no_target_form
  const noTarget = evaluateExample("We will expand soon.", "hire", []);
  assert(!noTarget.ok && noTarget.reasons.includes("no_target_form"), "missing target form should be rejected");

  // contains_other_cluster_form
  const containsOther = evaluateExample(
    "We might hire and rent equipment together.",
    "hire",
    ["rent"]
  );
  assert(
    !containsOther.ok && containsOther.reasons.includes("contains_other_cluster_form"),
    "contains other cluster form should be rejected"
  );

  console.log("All clusterQualityGates tests passed.");
}

// Auto-run if executed directly (optional)
if (require.main === module) {
  runClusterQualityGatesTests()
    .then(() => {
      console.log("Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

import assert from "node:assert/strict";
import { isAnswerSpoilerMessage } from "../src/lib/puzzle/normalize.ts";

assert.equal(isAnswerSpoilerMessage("ㅇㄱ", ["약국", "pharmacy"]), true);
assert.equal(isAnswerSpoilerMessage("ㅇㅎ", ["은행"]), true);
assert.equal(isAnswerSpoilerMessage(" ㅇ ㄱ ", ["약국"]), true);
assert.equal(isAnswerSpoilerMessage("약국입니다", ["약국"]), true);
assert.equal(isAnswerSpoilerMessage("좋은 하루", ["약국"]), false);

console.log("Winner message spoiler checks passed.");

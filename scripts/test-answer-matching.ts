import assert from "node:assert/strict";
import { isAcceptedAnswer } from "../src/lib/puzzle/normalize.ts";

assert.equal(isAcceptedAnswer("마트", ["대형마트", "마트", "hypermarket", "할인점"]), true);
assert.equal(isAcceptedAnswer("학생", ["책가방", "school bag", "학생가방"]), false);
assert.equal(isAcceptedAnswer("컴퓨터", ["키보드", "keyboard", "컴퓨터자판"]), false);
assert.equal(isAcceptedAnswer("대형마", ["대형마트"]), false);

console.log("Answer matching checks passed.");

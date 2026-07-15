import assert from "node:assert/strict";
import { ensureAnonymousSessionId } from "../src/lib/puzzle/actor-session.ts";

const existing = "existing-session-id";
assert.equal(ensureAnonymousSessionId(existing), existing);
assert.match(ensureAnonymousSessionId(), /^[0-9a-f-]{36}$/);
assert.notEqual(ensureAnonymousSessionId("short"), "short");

console.log("Actor anonymous session checks passed.");

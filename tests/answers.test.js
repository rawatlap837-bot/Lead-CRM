import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswers, flattenLeads } from "../src/lib/answers.js";
test("answers handle null, arrays, objects, strings and malformed JSON", () => {
  assert.deepEqual(normalizeAnswers(null), []);
  assert.deepEqual(normalizeAnswers([]), []);
  assert.deepEqual(normalizeAnswers({ Budget: 0 }), [
    { question: "Budget", answer: "0" },
  ]);
  assert.deepEqual(normalizeAnswers('[{"question":"Ready?","answer":false}]'), [
    { question: "Ready?", answer: "false" },
  ]);
  assert.equal(normalizeAnswers("not JSON")[0].answer, "not JSON");
  assert.equal(
    normalizeAnswers([null, { question: "Team", answer: { size: 4 } }])[0]
      .answer,
    '{"size":4}',
  );
});
test("export columns include all questions, preserve leading zero phones and combine duplicates", () => {
  const result = flattenLeads([
    {
      name: "A",
      phone: "00123",
      answers: [
        { question: "Budget", answer: "10" },
        { question: "Budget", answer: "20" },
      ],
    },
    { name: "B", answers: { Team: "5" } },
  ]);
  assert.deepEqual(result.headers.slice(6), ["Budget", "Team"]);
  assert.equal(result.rows[0][1], "00123");
  assert.deepEqual(result.rows[0].slice(6), ["10; 20", ""]);
  assert.deepEqual(result.rows[1].slice(6), ["", "5"]);
});

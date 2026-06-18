const assert = require("node:assert/strict");
const test = require("node:test");

const { prepareSpeechText, speakableCommand } = require("../voice/speechTextProcessor.cjs");

function normalize(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

test("speech processor removes headings, emphasis, and hashtags", () => {
  const prepared = prepareSpeechText("## Hello **Yash** #AI");

  assert.equal(normalize(prepared.spokenText), "Hello Yash.");
  assert.doesNotMatch(prepared.spokenText, /[#*]/);
});

test("speech processor keeps normal prose readable", () => {
  const prepared = prepareSpeechText("This is already a normal sentence.");

  assert.equal(normalize(prepared.spokenText), "This is already a normal sentence.");
});

test("speech processor replaces fenced code with a short spoken note", () => {
  const prepared = prepareSpeechText("```js\nconsole.log('hello')\n```");

  assert.match(normalize(prepared.spokenText), /included the code block in chat/i);
  assert.doesNotMatch(prepared.spokenText, /console\.log/);
});

test("speech processor turns bullet lists into separated sentences", () => {
  const prepared = prepareSpeechText("- item one\n- item two");

  assert.equal(normalize(prepared.spokenText), "item one. item two.");
});

test("speech processor removes raw links and keeps local pages human readable", () => {
  const prepared = prepareSpeechText("Visit http://localhost:5173 and https://example.com");

  assert.equal(normalize(prepared.spokenText), "Visit the local B.R.A.C.E page.");
  assert.doesNotMatch(prepared.spokenText, /https?:\/\//);
});

test("speech processor removes standalone hashtags", () => {
  const prepared = prepareSpeechText("Great progress #AI #Voice");

  assert.equal(normalize(prepared.spokenText), "Great progress.");
});

test("speech processor does not truncate everything after Route labels", () => {
  const prepared = prepareSpeechText("Route: Chat\nHere is the answer after the route.");

  assert.match(normalize(prepared.spokenText), /Here is the answer after the route\./);
});

test("speech processor keeps long responses from becoming one word", () => {
  const prepared = prepareSpeechText("**First** sentence. **Second** sentence. **Third** sentence with enough words.");

  assert.ok(normalize(prepared.spokenText).split(/\s+/).length > 6);
});

test("speech processor makes commands and Windows paths speakable", () => {
  const prepared = prepareSpeechText("Run `npm run dev:localhost` in `C:\\Users\\Admin\\Documents\\B.R.A.C.E-MAIN`.");

  assert.match(normalize(prepared.spokenText), /npm run dev localhost/);
  assert.match(normalize(prepared.spokenText), /C drive\. Users\. Admin\. Documents\. B R A C E main/);
  assert.equal(speakableCommand("npm run dev:localhost"), "npm run dev localhost");
});

test("speech processor is safe for empty input", () => {
  const prepared = prepareSpeechText("");

  assert.equal(prepared.spokenText, "");
  assert.deepEqual(prepared.chunks, []);
});

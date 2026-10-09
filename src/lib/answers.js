export function textValue(value) {
  return typeof value === "object" && value !== null
    ? JSON.stringify(value)
    : String(value ?? "");
}
export function normalizeAnswers(value) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [{ question: "Response", answer: value }];
    }
  }
  if (Array.isArray(value))
    return value
      .filter((item) => item != null)
      .map((item, i) =>
        typeof item === "object"
          ? {
              question: textValue(item.question || `Question ${i + 1}`),
              answer: textValue(item.answer),
            }
          : { question: `Question ${i + 1}`, answer: textValue(item) },
      );
  if (value && typeof value === "object")
    return Object.entries(value).map(([question, answer]) => ({
      question,
      answer: textValue(answer),
    }));
  return [];
}
export function flattenLeads(leads) {
  const questions = [
    ...new Set(
      leads.flatMap((lead) => normalizeAnswers(lead.answers).map((a) => a.question)),
    ),
  ];
  const headers = [
    "Name",
    "Phone",
    "Email",
    "Status",
    "Source",
    "Created date",
    ...questions,
  ];
  const rows = leads.map((lead) => {
    const answers = normalizeAnswers(lead.answers);
    return [
      lead.name || "",
      lead.phone || "",
      lead.email || "",
      lead.status || "",
      lead.source || "",
      lead.created_at || "",
      ...questions.map((q) =>
        answers
          .filter((a) => a.question === q)
          .map((a) => a.answer)
          .join("; "),
      ),
    ];
  });
  return { headers, rows };
}

// Copy this file into the existing Google Sheet's Apps Script project.
// No landing-page form code needs to change. Requires CRM receiver secrets below.
var CRM_SHEET_SYNC_BATCH = 10;

function syncSheetLeadsToCrm() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    var properties = PropertiesService.getScriptProperties();
    var sheetId = properties.getProperty("CRM_SOURCE_SHEET_ID") || properties.getProperty("SHEET_ID");
    var sheetName = properties.getProperty("CRM_SOURCE_SHEET_NAME") || "Leads";
    if (!sheetId) throw new Error("Set CRM_SOURCE_SHEET_ID in Script properties.");
    var sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    if (!sheet) throw new Error("Could not find the configured leads sheet.");
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    if (lastRow < 2 || lastColumn < 1) return;

    var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
    var normalized = headers.map(function(value) { return crmSheetNormalizeHeader_(value); });
    var statusColumn = normalized.indexOf("crmdelivery");
    if (statusColumn < 0) statusColumn = normalized.indexOf("crmsyncstatus");
    if (statusColumn < 0) {
      statusColumn = lastColumn;
      sheet.getRange(1, statusColumn + 1).setValue("CRM delivery");
      headers.push("CRM delivery");
      normalized.push("crmdelivery");
      lastColumn++;
    }

    var processed = 0;
    for (var end = lastRow; end >= 2 && processed < CRM_SHEET_SYNC_BATCH;) {
      var start = Math.max(2, end - 199);
      var rows = sheet.getRange(start, 1, end - start + 1, lastColumn).getDisplayValues();
      for (var i = rows.length - 1; i >= 0 && processed < CRM_SHEET_SYNC_BATCH; i--) {
        var rowNumber = start + i;
        var existingStatus = String(rows[i][statusColumn] || "").trim().toLowerCase();
        if (existingStatus.indexOf("delivered") >= 0 || existingStatus === "synced") continue;
        if (rows[i].every(function(value) { return !String(value || "").trim(); })) continue;
        var lead = crmSheetBuildLead_(headers, normalized, rows[i], properties);
        if (!lead.name || !lead.phone) {
          sheet.getRange(rowNumber, statusColumn + 1).setValue("Skipped - missing name or phone");
          continue;
        }
        processed++;
        var result = crmSheetSendLead_(lead, properties);
        sheet.getRange(rowNumber, statusColumn + 1).setValue(result.delivered ? "Delivered to CRM" : "Pending - " + result.error);
      }
      end = start - 1;
    }
  } finally {
    lock.releaseLock();
  }
}

function crmSheetBuildLead_(headers, normalized, row, properties) {
  function value(names) {
    for (var i = 0; i < names.length; i++) {
      var index = normalized.indexOf(names[i]);
      if (index >= 0 && row[index]) return String(row[index]).trim();
    }
    return "";
  }
  var firstName = value(["firstname", "givenname"]);
  var lastName = value(["lastname", "familyname", "surname"]);
  var name = value(["name", "fullname", "leadname", "contactname"]) || [firstName, lastName].filter(Boolean).join(" ");
  var answers = {};
  var rawAnswers = value(["answers", "responses", "formanswers"]);
  if (rawAnswers) {
    try {
      var parsed = JSON.parse(rawAnswers);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) answers = parsed;
      else if (Array.isArray(parsed)) parsed.forEach(function(item) { if (item && item.question) answers[String(item.question)] = String(item.answer || ""); });
    } catch (ignored) { /* Individual answer columns below remain available. */ }
  }
  var reserved = { timestamp:1, submittedat:1, createdat:1, eventid:1, leadid:1, name:1, fullname:1, leadname:1, contactname:1, firstname:1, givenname:1, lastname:1, familyname:1, surname:1, phone:1, phonenumber:1, mobile:1, mobileno:1, contactnumber:1, email:1, emailaddress:1, source:1, leadsource:1, landingpage:1, landingpagesource:1, pagename:1, pagetitle:1, pageurl:1, landingpageurl:1, websiteurl:1, crmstatus:1, crmdelivery:1, crmsyncstatus:1, status:1 };
  normalized.forEach(function(header, index) {
    if (!header || reserved[header] || !String(row[index] || "").trim()) return;
    answers[headers[index]] = String(row[index]).trim();
  });
  return {
    name: name,
    phone: value(["phone", "phonenumber", "mobile", "mobileno", "contactnumber"]),
    email: value(["email", "emailaddress"]),
    answers: answers,
    source: value(["source", "leadsource", "landingpage", "landingpagesource", "pagename", "pagetitle", "pageurl", "landingpageurl", "websiteurl"]) || properties.getProperty("CRM_LEAD_SOURCE") || "Landing page",
    status: "new"
  };
}

function crmSheetSendLead_(lead, properties) {
  var endpoint = properties.getProperty("CRM_LEAD_RECEIVER_URL");
  var secret = properties.getProperty("CRM_LEAD_INGEST_SECRET");
  if (!endpoint || !secret) return { delivered: false, error: "CRM connection is not configured" };
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/super-worker$/i.test(endpoint)) return { delivered: false, error: "CRM receiver URL is invalid" };
  try {
    var response = UrlFetchApp.fetch(endpoint, {
      method: "post", contentType: "application/json", muteHttpExceptions: true,
      headers: { Authorization: "Bearer " + secret },
      payload: JSON.stringify(lead)
    });
    var body = JSON.parse(response.getContentText() || "{}");
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300 && body.success === true) return { delivered: true };
    return { delivered: false, error: "HTTP " + response.getResponseCode() };
  } catch (error) {
    console.error("Lead sync failed: " + error.message);
    return { delivered: false, error: "receiver unavailable" };
  }
}

function crmSheetNormalizeHeader_(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function installCrmSheetSync() {
  ScriptApp.getProjectTriggers().filter(function(trigger) { return trigger.getHandlerFunction() === "syncSheetLeadsToCrm"; }).forEach(function(trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger("syncSheetLeadsToCrm").timeBased().everyMinutes(1).create();
  syncSheetLeadsToCrm();
}

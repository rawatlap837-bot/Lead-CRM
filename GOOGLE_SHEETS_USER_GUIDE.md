# Connect Google Sheets to the CRM

This guide is for people who use the CRM but do not write code. You need access to
the CRM and the Google Sheet that contains your leads. You do not need Supabase
keys.

## Before you start

- Your CRM administrator must have completed the one-time server setup.
- Your Sheet should have a header row at the top and one lead on each row.
- Each lead needs a name and phone number. Email and other answer columns are
  optional. Include the country code in phone numbers.

If **Check setup** says the receiver is unavailable or not deployed, ask your CRM
administrator to finish the server setup before continuing.

## Connect your Sheet

1. In the CRM, open **Lead connections**.
2. Click **Create secure connection** once. This creates a private key for your
   CRM account. Keep the connector code private. Do not click this again unless
   you need to replace a lost or exposed key; creating a new key disables the
   previous one.
3. Paste the Google Sheet URL into **Google Sheet link**.
4. Enter the exact tab name shown at the bottom of your Sheet. For example, if
   the tab says Enquiries, enter Enquiries.
5. Enter a **CRM page name** such as **Digital Marketing Lead**. This is the name
   used to group these leads in the CRM.
6. Click **Prepare connection**, then **Copy connector code**.
7. Open your Google Sheet. Choose **Extensions → Apps Script**.
8. In Apps Script, click the plus sign beside **Files**, add a script file, and
   name it **CRM Sync**.
9. Paste the copied connector code into the new **CRM Sync** file and save.
   **Keep your existing files and form code. Do not replace or delete them.**
10. In the Apps Script function menu, choose **setupMyCrmSheet** and click
    **Run**. Follow Google's permission prompts.
11. Return to the Sheet. The connector adds a **CRM delivery** column and starts
    sending rows. New rows are checked about once a minute. To run it now, reload
    the Sheet and choose **CRM sync → Sync now**.

## Check that it worked

Look at the **CRM delivery** column:

- **Delivered to CRM** means the row arrived.
- **Pending - ...** means the CRM could not accept the row yet.
- **Skipped - missing name or phone** means the row needs a name and phone value.

Open **Lead connections** in the CRM and look for the page name you entered. Its
lead count should increase as rows arrive.

Already delivered rows are not sent again. If you have a large Sheet, the
connector sends a small batch each minute until it catches up.

## Fix common problems

### “CRM project key is invalid”

The Sheet has a key that the CRM no longer recognizes.

1. Return to **Lead connections** and create a new secure connection once.
2. Prepare the connection again using the same Sheet link, tab name, and CRM
   page name.
3. Copy the new connector code.
4. In Apps Script, replace the contents of only the **CRM Sync** file with the
   new code, then save.
5. Run **setupMyCrmSheet** again.

The new key replaces the old one for your CRM account. Other Sheets using the
old key will need the new code too.

### “Receiver is not deployed”

This is a one-time CRM administrator task. Ask the administrator to deploy the
CRM's lead receiver. There is no setting to change in your Google Sheet.

### “Skipped - missing name or phone”

Check the first row of the Sheet. Use headers such as Name and Phone.
Full Name, Lead Name, Mobile, or Phone Number also work. Make sure each
affected row has values in both columns.

### A row says “Pending”

Reload the Sheet and choose **CRM sync → Sync now** to retry. If the delivery
message still appears, copy the complete message from that row and give it to
your CRM administrator.

## Keep the connection private

The connector code contains a private key for your CRM account. Do not post it
in a public document or send it to anyone. If you think someone else has it,
create a new secure connection and update your Sheet's **CRM Sync** file.

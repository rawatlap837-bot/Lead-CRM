# Named lead sections and imports

## Enable new sections

Run `supabase/custom-sections.sql` in Supabase SQL Editor after the existing `page-access.sql`, `personal-workspaces.sql`, and `page-names.sql` setup. File uploads also require `flexible-imports.sql`.

This migration has been tested locally in disposable PostgreSQL; it has not been applied to your production Supabase database. Run it last if reinstalling the earlier page-access or personal-workspace migrations, since they replace the same access functions.

## Use it

- On Leads, choose **New section**, enter a name, and create it. The empty section appears as a tab immediately. Select it to add leads or import a spreadsheet.
- In **Import Excel**, choose **New named section** to create a section while importing, or choose an existing section. The filename supplies an initial section name that you can edit.
- After choosing a file, edit **Import name** to label that upload. This is saved as the upload's name without changing its cell data.
- Sections have stable internal identifiers. Their readable titles can be changed through the existing rename option.
- Normal users own the sections they create. Other normal users need explicit page access; administrators retain access to all sections.

## Mobile records

On screens below 768px, leads show compact cards with name, phone, status, and a details link. Uploaded rows show a short preview with a collapsed **All details** control. Expand it to see every field, or choose **Edit row**. Desktop tables remain available at larger widths. No data is removed or shortened in storage.

## Code locations

- `src/components/NewSection.jsx`: creation form.
- `src/lib/sections.js`: create and list section APIs.
- `src/components/ImportLeads.jsx`: section destination and import naming.
- `src/components/CompactRecord.jsx`: expandable mobile file-row card.
- `src/components/FileData.jsx`: uploaded records and row editing.
- `supabase/custom-sections.sql`: section ownership and database permissions.


### Rename and delete

Run the updated `supabase/custom-sections.sql` again to enable deletion. On Leads, select a custom section to see the pencil Rename page and trash Delete section controls. Only its owner or an administrator may delete it. A confirmation lists the records removed: leads, imported rows, follow-ups and shared access. The database removes them together in one transaction. Default personal workspaces and external Sheet sources cannot be deleted through this control.

Existing source sections now have Delete section for administrators. Personal workspaces have Delete leads for their owner or an administrator; this clears records while preserving the default section, title and sharing. Deleting a connected source does not stop its external connector, which may recreate it when new data arrives.

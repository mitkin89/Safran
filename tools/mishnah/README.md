# Digital Mishnah: Berakhot pilot

Pinned source commit: `39389be30e93032d722e8dd3b7bcdfe15e76a421`,
https://github.com/umd-mith/mishnah-data .

Kaufmann `S07326`, Parma `S00483`, Cambridge `S01520` explicitly name
CC BY 4.0 in their individual TEI headers. Full original XML snapshots are in
`sources/*.xml.gz`, with SHA-256 recorded in the runtime data. Only Berakhot is
exposed in Safran. `python3 tools/mishnah/build.py` rebuilds offline.

The reference uses the source's encoded `ab` references (57 Kaufmann, 57 Parma,
59 Cambridge), not the manuscripts' internal `MSMishnah` milestones and not a
verified mapping to every reader edition. It does not replace the reading text.
No reader word highlighting or manuscript morphology is inferred.

The extract shows the corrected reading state: `add` is retained, `del` is
excluded from the running extract, and original `abbr` is preferred to `expan`.
`choice` expansions are matching aids only. All annotations (including implied
editorial additions, deletions, filling material, damage, uncertainty and gaps)
remain individually accessible with exact source attributes and original TEI.
Whitespace/tokenization is mechanical; original XML remains authoritative.

Chapter-wide sequence comparison avoids forcing Cambridge's extra units onto
identically numbered Kaufmann units. Hints retain all participating source
references. They are automated comparison candidates, not a manually reviewed
apparatus or a classification of genealogical/semantic significance. Damaged
and uncertain material is never displayed as a secure omission. This is a pilot:
complete reference mapping and philological review are still required.

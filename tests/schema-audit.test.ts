import assert from "node:assert/strict";
import { compareSnapshot } from "../scripts/schema-audit";
const snapshot = { tables: { "public.videos": { columns: { id: { type: "serial", notNull: true, primaryKey: true }, title: { type: "varchar(120)", notNull: true, primaryKey: false } }, indexes: { videos_title_idx: {} }, foreignKeys: { videos_owner_fk: {} }, uniqueConstraints: {} } } };
const columns = [
  { table_name: "videos", column_name: "id", data_type: "integer", character_maximum_length: null, is_nullable: "NO", column_default: "nextval('videos_id_seq'::regclass)" },
  { table_name: "videos", column_name: "title", data_type: "character varying", character_maximum_length: 120, is_nullable: "NO", column_default: null },
];
const indexes = [{ tablename: "videos", indexname: "videos_title_idx" }];
const constraints = [{ table_name: "videos", constraint_name: "videos_pkey" }, { table_name: "videos", constraint_name: "videos_owner_fk" }];
assert.deepEqual(compareSnapshot(snapshot, columns, indexes, constraints), []);
const missing = compareSnapshot(snapshot, columns.slice(0, 1), [], []);
assert.ok(missing.some(error => error.includes("Missing column videos.title")));
assert.ok(missing.some(error => error.includes("Missing index videos.videos_title_idx")));
assert.ok(missing.some(error => error.includes("Missing constraint videos.videos_owner_fk")));
assert.ok(missing.some(error => error.includes("Missing primary key videos")));
const incompatible = compareSnapshot(snapshot, [{ ...columns[0] }, { ...columns[1], character_maximum_length: 50, is_nullable: "YES" }], indexes, constraints);
assert.ok(incompatible.some(error => error.includes("Type mismatch")));
assert.ok(incompatible.some(error => error.includes("Nullability mismatch")));
console.log("PASS: schema audit detects missing and incompatible database objects.");

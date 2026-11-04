import { readFileSync } from "node:fs";
import type { Pool, PoolClient } from "pg";

type Snapshot = { tables: Record<string, { columns: Record<string, { type: string; notNull: boolean; primaryKey: boolean; default?: string | number | boolean }>; indexes: Record<string, unknown>; foreignKeys: Record<string, unknown>; uniqueConstraints: Record<string, unknown> }> };
type ActualColumn = { table_name: string; column_name: string; data_type: string; character_maximum_length: number | null; is_nullable: string; column_default: string | null };
type ActualIndex = { tablename: string; indexname: string };
type ActualConstraint = { table_name: string; constraint_name: string };

export function readSnapshot(tag: string): Snapshot {
  if (!/^\d{4}_/.test(tag)) throw new Error("Invalid migration tag.");
  const number = tag.slice(0, 4);
  return JSON.parse(readFileSync(`./drizzle/meta/${number}_snapshot.json`, "utf8")) as Snapshot;
}

function normalizeType(type: string) {
  return type.toLowerCase().replace(/^character varying/, "varchar").replace(/^timestamp without time zone$/, "timestamp").replace(/^serial$/, "integer").replace(/^bigserial$/, "bigint");
}

function normalizeDefault(value: string | number | boolean) {
  return String(value).replace(/::(?:character varying|text|jsonb)$/i, "");
}

/** Check additive schema drift without exposing row data or making changes. */
export function compareSnapshot(snapshot: Snapshot, columns: ActualColumn[], indexes: ActualIndex[], constraints: ActualConstraint[]) {
  const problems: string[] = [];
  const columnMap = new Map(columns.map(row => [`${row.table_name}.${row.column_name}`, row]));
  const indexSet = new Set(indexes.map(row => `${row.tablename}.${row.indexname}`));
  const constraintSet = new Set(constraints.map(row => `${row.table_name}.${row.constraint_name}`));
  for (const [qualifiedName, table] of Object.entries(snapshot.tables)) {
    const [schema, name] = qualifiedName.split(".");
    if (schema !== "public" || !name) throw new Error(`Unexpected schema in snapshot: ${qualifiedName}`);
    for (const [column, expected] of Object.entries(table.columns)) {
      const actual = columnMap.get(`${name}.${column}`);
      if (!actual) { problems.push(`Missing column ${name}.${column}`); continue; }
      const actualType = actual.data_type === "character varying" && actual.character_maximum_length !== null ? `varchar(${actual.character_maximum_length})` : actual.data_type;
      if (normalizeType(actualType) !== normalizeType(expected.type)) problems.push(`Type mismatch for ${name}.${column}: expected ${expected.type}, found ${actualType}`);
      if (expected.default !== undefined && (actual.column_default === null || normalizeDefault(actual.column_default) !== normalizeDefault(expected.default))) problems.push(`Default mismatch for ${name}.${column}`);
      if ((actual.is_nullable === "NO") !== (expected.notNull || expected.primaryKey)) problems.push(`Nullability mismatch for ${name}.${column}`);
    }
    for (const index of Object.keys(table.indexes)) if (!indexSet.has(`${name}.${index}`)) problems.push(`Missing index ${name}.${index}`);
    for (const constraint of [...Object.keys(table.foreignKeys), ...Object.keys(table.uniqueConstraints)]) if (!constraintSet.has(`${name}.${constraint}`)) problems.push(`Missing constraint ${name}.${constraint}`);
    if (Object.values(table.columns).some(column => column.primaryKey) && !constraints.some(row => row.table_name === name && row.constraint_name === `${name}_pkey`)) problems.push(`Missing primary key ${name}`);
  }
  return problems;
}

export async function auditSnapshot(pool: Pool | PoolClient, snapshot: Snapshot) {
  const [columns, indexes, constraints] = await Promise.all([
    pool.query<ActualColumn>("select table_name, column_name, data_type, character_maximum_length, is_nullable, column_default from information_schema.columns where table_schema = 'public'"),
    pool.query<ActualIndex>("select tablename, indexname from pg_indexes where schemaname = 'public'"),
    pool.query<ActualConstraint>("select table_name, constraint_name from information_schema.table_constraints where table_schema = 'public'"),
  ]);
  return compareSnapshot(snapshot, columns.rows, indexes.rows, constraints.rows);
}

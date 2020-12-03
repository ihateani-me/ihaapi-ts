import { readFileSync } from "fs";
import { resolve } from "path";

function readAndGetSchema(schema_name: string): string {
    if (schema_name.endsWith(".graphql")) {
        schema_name = schema_name.replace(".graphql", "");
    }
    let resolve_path = resolve(__dirname, "schema", `${schema_name}.graphql`);
    const readPointer = readFileSync(resolve_path);
    return readPointer.toString();
}

export const vtbAPISchema = readAndGetSchema("vtapi");

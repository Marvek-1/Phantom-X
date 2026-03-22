# Neo4j Desktop -> Aura Export

Use the automation script at `services/export-neo4j-aura.ps1` to export your local Grid database and import/upload to Aura.

## Prerequisites

1. Stop your local Neo4j database in Neo4j Desktop.
2. Ensure `neo4j-admin` is available:
   - via `NEO4J_HOME`, or
   - by passing `-Neo4jHome`, or
   - in `PATH`.

## Option A (recommended): Create dump file

```powershell
.\services\export-neo4j-aura.ps1 -Mode dump -DatabaseName neo4j -DumpToPath "$env:USERPROFILE\Desktop"
```

Then in Aura Console:

1. Open your Aura instance.
2. Use **Import Database**.
3. Upload the generated `.dump` file.

Verify in Aura Browser:

```cypher
MATCH (n) RETURN count(n);
```

Expected result for this project: `740`.

## Option B: Direct upload to Aura

```powershell
$cred = Get-Credential
```

```powershell
.\services\export-neo4j-aura.ps1 \
  -Mode upload \
  -DatabaseName neo4j \
  -AuraUri "neo4j+s://<your-aura-id>.databases.neo4j.io" \
  -AuraCredential $cred \
  -OverwriteDestination
```

## Notes

- The script fails fast if local Neo4j appears to be running on port `7687`.
- Use `-SkipRunningCheck` only if your setup does not expose localhost bolt but the DB is already stopped.
- If dump/upload fails due to version mismatch, use the opposite mode (dump import vs direct upload) or align Desktop/Aura compatibility.

#requires -Version 7.0
# Read-only reconciliation of this development acceptance run. No DB writes.
param([string]$PsqlPath='C:/Program Files/PostgreSQL/18/bin/psql.exe')
$ErrorActionPreference='Stop'
$root=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$connection=[System.Data.Common.DbConnectionStringBuilder]::new()
foreach($name in @('appsettings.json','appsettings.Production.json')) {
    $config=Get-Content (Join-Path $root "skolenza.api/$name") -Raw | ConvertFrom-Json
    if($config.ConnectionStrings.DefaultConnection) {$connection.set_ConnectionString($config.ConnectionStrings.DefaultConnection)}
}
if($env:ConnectionStrings__DefaultConnection) {$connection.set_ConnectionString($env:ConnectionStrings__DefaultConnection)}
if(-not $connection['Host'] -or -not $connection['Database']) {throw 'Target connection missing.'}
$saved=@{}
$settings=@{PGHOST=[string]$connection['Host'];PGDATABASE=[string]$connection['Database'];PGUSER=[string]$connection['Username'];PGPASSWORD=[string]$connection['Password'];PGSSLMODE='require';PGCONNECT_TIMEOUT='15'}
try {
    foreach($key in $settings.Keys) {
        $saved[$key]=[Environment]::GetEnvironmentVariable($key,'Process')
        [Environment]::SetEnvironmentVariable($key,$settings[$key],'Process')
    }
    $query=@'
SELECT json_build_object(
 'rows',(SELECT json_agg(r) FROM (
 SELECT 'Department' AS master,"Id" AS id,"TenantId" AS tenant_id,"DepartmentName" AS name,"Description" AS description,"Remark" AS remark,"IsActive" AS active,NULL::bigint AS department_id,NULL::text AS department_name,NULL::integer AS role_type FROM skolenza."Department" WHERE "DepartmentName" LIKE 'UIQA-20260910-%'
 UNION ALL
 SELECT 'Designation',d."Id",d."TenantId",d."DesignationName",d."Description",NULL,d."IsActive",d."DepartmentId",p."DepartmentName",NULL FROM skolenza."Designation" d JOIN skolenza."Department" p ON p."Id"=d."DepartmentId" WHERE d."DesignationName" LIKE 'UIQA-20260910-%'
 UNION ALL
 SELECT 'Role',"Id","TenantId","RoleName",NULL,"Remark","IsActive",NULL,NULL,"RoleType" FROM skolenza."Role" WHERE "RoleName" LIKE 'UIQA-20260910-%'
 UNION ALL
 SELECT 'EmployeeType',"Id","TenantId","TypeName","Description","Remark","IsActive",NULL,NULL,NULL FROM skolenza."EmployeeType" WHERE "TypeName" LIKE 'UIQA-20260910-%'
 ) r),
 'jobs',(SELECT json_agg(j) FROM (SELECT "Id" AS id,"TenantId" AS tenant_id,"Master" AS master,"Status" AS status,"NextRow" AS next_row FROM skolenza."BulkImportJob" WHERE "PreviewJson"::text LIKE '%UIQA-20260910-%') j)
);
'@
    $raw=& $PsqlPath -X -w -At -v ON_ERROR_STOP=1 -c $query
    if($LASTEXITCODE -ne 0) {throw 'Read-only DB query failed.'}
    $db=$raw | ConvertFrom-Json
    $db | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $PSScriptRoot 'results/db-sample-records.json')
    $summary=Get-Content (Join-Path $PSScriptRoot 'results/live-summary.json') -Raw | ConvertFrom-Json
    $checks=[System.Collections.Generic.List[object]]::new()
    foreach($run in $summary | Where-Object Result -EQ 'PASS') {
        $report=@(Import-Csv (Join-Path $PSScriptRoot "results/$($run.Master)-$($run.Source)-report.csv"))
        $job=$db.jobs | Where-Object id -EQ $run.JobId
        if(-not $job -or $job.tenant_id -ne 8 -or $job.status -ne 4) {throw "Persisted job differs: $($run.JobId)"}
        $rows=@($db.rows | Where-Object master -EQ $run.Master)
        if($rows.Count -ne 2 -or @($rows | Where-Object tenant_id -NE 8).Count) {throw "Unexpected persisted sample count/tenant: $($run.Master)"}
        foreach($line in $report) {
            $record=$rows | Where-Object id -EQ ([long]$line.RecordId)
            if(-not $record) {throw 'Report RecordId missing in DB.'}
            $values=$line.Values | ConvertFrom-Json
            $name=switch($run.Master) {'Department'{$values.DepartmentName};'Designation'{$values.DesignationName};'Role'{$values.RoleName};'EmployeeType'{$values.TypeName}}
            if($record.name -cne $name -or -not $record.active) {throw 'Persisted name/activity differs from report.'}
            if($run.Master -eq 'Designation' -and $record.department_name -cne $values.DepartmentName) {throw 'Designation parent differs from report.'}
            if($values.Description -and $record.description -cne $values.Description) {throw 'Description differs from report.'}
            if($values.Remark -and $record.remark -cne $values.Remark) {throw 'Remark differs from report.'}
            if($run.Master -eq 'Role' -and $record.role_type -ne [int]$values.RoleType) {throw 'RoleType differs from report.'}
        }
        $created=@($report | Where-Object Status -EQ 'Created').Count
        $existing=@($report | Where-Object Status -EQ 'Existing').Count
        if($created -ne $run.Created -or $existing -ne $run.Existing) {throw 'Report status counts differ from API.'}
        $checks.Add([pscustomobject]@{Master=$run.Master;Source=$run.Source;JobId=$run.JobId;Result='PASS';MatchedReportRows=$report.Count;TenantId=8})
    }
    $checks | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $PSScriptRoot 'results/db-verification.json')
    Write-Output "DB reconciliation PASS: $($checks.Count) jobs, $($db.rows.Count) master records; report IDs, values, ownership and counts match."
} finally {
    foreach($key in $saved.Keys) {[Environment]::SetEnvironmentVariable($key,$saved[$key],'Process')}
}


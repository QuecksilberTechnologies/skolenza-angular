#requires -Version 7.0
<#
Runs the development bulk acceptance samples through the real authenticated API.
Use only with the intended test tenant. Credentials come from process environment.
Creates the named sample records; repeated uploads must skip existing records.
#>
param(
    [string]$ApiBaseUrl='https://skolenza-api.onrender.com',
    [ValidateSet('Department','Designation','Role','EmployeeType')]
    [string[]]$Masters=@('Department','Designation','Role','EmployeeType')
)
$ErrorActionPreference='Stop'
if(-not $env:SKOLENZA_TEST_LOGIN_ID -or -not $env:SKOLENZA_TEST_LOGIN_PASSWORD) {
    throw 'Set SKOLENZA_TEST_LOGIN_ID and SKOLENZA_TEST_LOGIN_PASSWORD securely first.'
}
$resultsDirectory=Join-Path $PSScriptRoot 'results'
New-Item -ItemType Directory -Path $resultsDirectory -Force | Out-Null
$loginBody=@{
    loginId=$env:SKOLENZA_TEST_LOGIN_ID
    password=$env:SKOLENZA_TEST_LOGIN_PASSWORD
    macAddress=''
    ipAddressPublic=''
    ipAddressLocal='127.0.0.1'
    latitude=0
    longitude=0
    loginDevice=1
} | ConvertTo-Json
$login=Invoke-RestMethod "$ApiBaseUrl/api/NewLogin/login" -Method Post -ContentType application/json -Body $loginBody -TimeoutSec 45
if(-not $login.isSucceeded -or -not $login.data.accessToken) { throw 'Tenant login failed.' }
$headers=@{Authorization="Bearer $($login.data.accessToken)"}
$menu=Invoke-RestMethod "$ApiBaseUrl/api/Navigation/my-menu" -Headers $headers -TimeoutSec 45
function Flatten-Menu($nodes) {
    foreach($node in $nodes) {
        $node
        Flatten-Menu $node.children
    }
}
$nodes=@(Flatten-Menu $menu.data.items)
$definitions=@(
    @{Master='Department';Code='TENANT_DEPARTMENTS';File='01-department';Mapping=$null},
    @{Master='Designation';Code='TENANT_DESIGNATIONS';File='02-designation';Mapping='{"DesignationName":"DesName","DepartmentName":"Dept"}'},
    @{Master='Role';Code='TENANT_ROLES_PERMISSIONS';File='03-role';Mapping=$null},
    @{Master='EmployeeType';Code='TENANT_EMPLOYEE_TYPES';File='04-employee-type';Mapping=$null}
)
$summary=[System.Collections.Generic.List[object]]::new()
$previousSummary=Join-Path $resultsDirectory 'live-summary.json'
if(Test-Path $previousSummary) {
    foreach($previous in (Get-Content $previousSummary -Raw | ConvertFrom-Json)) {
        if($previous.Master -notin $Masters) {$summary.Add($previous)}
    }
}
foreach($definition in $definitions) {
    $master=$definition.Master
    if($master -notin $Masters) {continue}
    $node=$nodes | Where-Object moduleCode -EQ $definition.Code | Select-Object -First 1
    $add=$node.operations | Where-Object name -In @('Add','Import') | Select-Object -First 1
    $view=$node.operations | Where-Object name -EQ 'View' | Select-Object -First 1
    if(-not $node -or -not $add -or -not $view) {
        $summary.Add([pscustomobject]@{Master=$master;Source='All';Result='BLOCKED';Reason='Required module/Add/View grant absent from authenticated my-menu.'})
        Write-Output "$master BLOCKED: existing permission grant missing."
        continue
    }
    $base="$ApiBaseUrl/api/$master/bulk"
    Invoke-WebRequest "$base/template?ModuleId=$($node.id)&OperationId=$($view.id)" -Headers $headers -OutFile (Join-Path $resultsDirectory "$master-template.csv") -TimeoutSec 45
    foreach($source in @('xlsx','csv','paste')) {
        try {
            $form=@{ModuleId=[string]$node.id;OperationId=[string]$add.id;RequestId=[guid]::NewGuid().ToString()}
            if($source -eq 'paste') {
                $form.PastedText=Get-Content (Join-Path $PSScriptRoot "$($definition.File).csv") -Raw
            } else {
                $form.File=Get-Item (Join-Path $PSScriptRoot "$($definition.File).$source")
            }
            if($definition.Mapping) {$form.ColumnMappingJson=$definition.Mapping}
            $preview=Invoke-RestMethod "$base/preview" -Method Post -Headers $headers -Form $form -TimeoutSec 45
            $preview | ConvertTo-Json -Depth 30 | Set-Content (Join-Path $resultsDirectory "$master-$source-preview.json")
            if(-not $preview.data.canCommit) {throw 'Preview cannot commit; inspect saved preview.'}
            $jobId=$preview.data.jobId
            $body=@{JobId=$jobId;ModuleId=$node.id;OperationId=$add.id;ScheduledAtUtc=$null}|ConvertTo-Json
            $confirmed=Invoke-RestMethod "$base/confirm" -Method Post -Headers $headers -ContentType application/json -Body $body -TimeoutSec 45
            if(-not $confirmed.isSucceeded) {throw 'Confirmation failed.'}
            $deadline=(Get-Date).AddSeconds(90)
            do {
                $detail=Invoke-RestMethod "$base/jobs/$($jobId)?ModuleId=$($node.id)&OperationId=$($view.id)" -Headers $headers -TimeoutSec 45
                if($detail.data.status -in @(4,5,6,7)) {break}
                Start-Sleep -Seconds 2
            } while((Get-Date) -lt $deadline)
            $detail | ConvertTo-Json -Depth 30 | Set-Content (Join-Path $resultsDirectory "$master-$source-job.json")
            if($detail.data.status -ne 4 -or $detail.data.failedCount -ne 0 -or $detail.data.processedRows -ne 2) {throw 'Worker did not complete two rows successfully.'}
            if($source -ne 'xlsx' -and ($detail.data.createdCount -ne 0 -or $detail.data.existingCount -ne 2)) {throw 'Existing-record replay did not skip both rows.'}
            $reportPath=Join-Path $resultsDirectory "$master-$source-report.csv"
            Invoke-WebRequest "$base/jobs/$jobId/report?ModuleId=$($node.id)&OperationId=$($view.id)" -Headers $headers -OutFile $reportPath -TimeoutSec 45
            $report=@(Import-Csv $reportPath)
            if($report.Count -ne 2) {throw 'Report row count differs from job result.'}
            $summary.Add([pscustomobject]@{Master=$master;Source=$source;Result='PASS';JobId=$jobId;ModuleId=$node.id;AddOperationId=$add.id;ViewOperationId=$view.id;Created=$detail.data.createdCount;Existing=$detail.data.existingCount;Failed=$detail.data.failedCount;ReportRows=$report.Count})
            Write-Output "$master $source PASS: created=$($detail.data.createdCount), existing=$($detail.data.existingCount), reportRows=$($report.Count)"
        } catch {
            $summary.Add([pscustomobject]@{Master=$master;Source=$source;Result='FAIL';Reason=$_.Exception.Message})
            Write-Output "$master $source FAIL: $($_.Exception.Message)"
            break
        } finally {
            $summary | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $resultsDirectory 'live-summary.json')
        }
    }
}
$summary | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $resultsDirectory 'live-summary.json')
Write-Output "Finished: $(@($summary | Where-Object Result -EQ 'PASS').Count) passed; $(@($summary | Where-Object Result -EQ 'FAIL').Count) failed; $(@($summary | Where-Object Result -EQ 'BLOCKED').Count) blocked."

#requires -Version 7.0
# Development-only HTTP validation checks. Uses the same authorized tenant account.
param([string]$ApiBaseUrl='https://skolenza-api.onrender.com')
$ErrorActionPreference='Stop'
if(-not $env:SKOLENZA_TEST_LOGIN_ID -or -not $env:SKOLENZA_TEST_LOGIN_PASSWORD) {throw 'Configure test credentials in process environment.'}
$login=Invoke-RestMethod "$ApiBaseUrl/api/NewLogin/login" -Method Post -ContentType application/json -Body (@{
    loginId=$env:SKOLENZA_TEST_LOGIN_ID;password=$env:SKOLENZA_TEST_LOGIN_PASSWORD
    macAddress='';ipAddressPublic='';ipAddressLocal='127.0.0.1';latitude=0;longitude=0;loginDevice=1
}|ConvertTo-Json) -TimeoutSec 45
$headers=@{Authorization="Bearer $($login.data.accessToken)"}
if(-not $login.isSucceeded) {throw 'Login failed.'}
$checks=[System.Collections.Generic.List[object]]::new()
$cases=@(
    @{Name='Designation missing alias mapping';Master='Designation';Module=26;Text="DesName,Dept`nUIQA-20260910-Manager,UIQA-20260910-Engineering"},
    @{Name='Duplicate Department rows';Master='Department';Module=25;Text="DepartmentName`nUIQA-20260910-Duplicate`nUIQA-20260910-Duplicate"},
    @{Name='Missing Department name';Master='Department';Module=25;Text="DepartmentName,Description`n,Missing name"},
    @{Name='Designation unknown parent';Master='Designation';Module=26;Text="DesignationName,DepartmentName`nUIQA-20260910-MissingParent,UIQA-20260910-NotPresent"}
)
$index=0
foreach($case in $cases) {
    $index++
    $preview=Invoke-RestMethod "$ApiBaseUrl/api/$($case.Master)/bulk/preview" -Method Post -Headers $headers -Form @{
        ModuleId=[string]$case.Module;OperationId='1';RequestId=[guid]::NewGuid().ToString();PastedText=$case.Text
    } -TimeoutSec 45
    $preview | ConvertTo-Json -Depth 30 | Set-Content (Join-Path $PSScriptRoot "results/negative-$index-preview.json")
    $blocked=$preview.data.canCommit -eq $false
    $confirmation=Invoke-WebRequest "$ApiBaseUrl/api/$($case.Master)/bulk/confirm" -Method Post -Headers $headers -ContentType application/json -Body (@{
        JobId=$preview.data.jobId;ModuleId=$case.Module;OperationId=1
    }|ConvertTo-Json) -SkipHttpErrorCheck -TimeoutSec 45
    $checks.Add([pscustomobject]@{Case=$case.Name;Result=$(if($blocked -and $confirmation.StatusCode -ge 400){'PASS'}else{'FAIL'});CanCommit=$preview.data.canCommit;ConfirmHttpStatus=[int]$confirmation.StatusCode;JobId=$preview.data.jobId})
}
foreach($case in @(
    @{Name='Anonymous template rejected';Url='/api/Department/bulk/template?ModuleId=25&OperationId=4';Headers=@{}},
    @{Name='EmployeeType missing entitlement rejected';Url='/api/EmployeeType/bulk/template?ModuleId=79&OperationId=4';Headers=$headers}
)) {
    $response=Invoke-WebRequest "$ApiBaseUrl$($case.Url)" -Headers $case.Headers -SkipHttpErrorCheck -TimeoutSec 45
    $checks.Add([pscustomobject]@{Case=$case.Name;Result=$(if($response.StatusCode -in @(401,403)){'PASS'}else{'FAIL'});HttpStatus=[int]$response.StatusCode})
}
$response=Invoke-WebRequest "$ApiBaseUrl/api/Department/bulk/preview" -Headers $headers -Method Post -Form @{
    ModuleId='25';OperationId='4';PastedText="DepartmentName`nUIQA-20260910-NoViewCreate"
} -SkipHttpErrorCheck -TimeoutSec 45
$checks.Add([pscustomobject]@{Case='View operation cannot preview/create';Result=$(if($response.StatusCode -eq 403){'PASS'}else{'FAIL'});HttpStatus=[int]$response.StatusCode})
$checks | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $PSScriptRoot 'results/validation-summary.json')
$checks | Format-Table Case,Result,CanCommit,ConfirmHttpStatus,HttpStatus

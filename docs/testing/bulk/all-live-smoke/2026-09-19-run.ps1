param(
    [Parameter(Mandatory)][string]$HostLoginId,
    [Parameter(Mandatory)][securestring]$HostPassword,
    [Parameter(Mandatory)][string]$TenantLoginId,
    [Parameter(Mandatory)][securestring]$TenantPassword,
    [string]$ApiBase = 'https://skolenza-api.onrender.com'
)
$ErrorActionPreference = 'Stop'
$out = Join-Path $PSScriptRoot '2026-09-19-evidence'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$evidence = [ordered]@{ capturedAt = (Get-Date).ToString('o'); apiBase = $ApiBase; results = @(); inserted = @(); gaps = @() }

function Plain([securestring]$s) { [Net.NetworkCredential]::new('', $s).Password }
function Login([string]$id, [securestring]$password) {
    $body = @{ loginId=$id; password=(Plain $password); macAddress=''; ipAddressPublic=''; ipAddressLocal='127.0.0.1'; latitude=0; longitude=0; loginDevice=1 } | ConvertTo-Json
    (Invoke-RestMethod -Method Post -Uri "$ApiBase/api/NewLogin/login" -ContentType 'application/json' -Body $body).data
}
function Headers($token) { @{ Authorization = "Bearer $token" } }
function Flat($items) { $all=@(); foreach($x in @($items)){ $all += $x; if($x.children){$all += Flat $x.children} }; $all }
function Items($data) { if($null -ne $data.items){ @($data.items) } else { @($data) } }
function Menu($token) { Flat ((Invoke-RestMethod -Uri "$ApiBase/api/Navigation/my-menu" -Headers (Headers $token)).data.items) }
function Permission($menu,[string]$code,[string]$operation) {
    $m = $menu | Where-Object moduleCode -eq $code | Select-Object -First 1
    if(-not $m){ throw "Menu module $code not found." }
    $op = $m.operations | Where-Object name -eq $operation | Select-Object -First 1
    if(-not $op){ throw "$operation permission on $code not found." }
    [pscustomobject]@{ ModuleId=[int]$m.id; OperationId=[int]$op.id; Code=$code; Operation=$operation }
}
function Csv($row) { ($row | ConvertTo-Csv -NoTypeInformation) -join "`r`n" }
function ReportId([string]$name) {
    $row = Import-Csv -LiteralPath (Join-Path $out "$name-report.csv") | Select-Object -First 1
    if (-not $row -or -not $row.RecordId) { throw "$name report did not contain a RecordId." }
    [long]$row.RecordId
}
function Record($target,$step,$status,$detail,$jobId=$null) { $evidence.results += [ordered]@{target=$target;step=$step;status=$status;detail=$detail;jobId=$jobId} }
function WaitTenantJob($token,$base,$jobId,$permission) {
    for($i=0;$i -lt 40;$i++){
        $u="$ApiBase$base/jobs/$jobId`?ModuleId=$($permission.ModuleId)&OperationId=$($permission.OperationId)"
        $d=(Invoke-RestMethod -Uri $u -Headers (Headers $token)).data
        if([int]$d.status -in 4,5,6,7){return $d}; Start-Sleep -Seconds 2
    }; throw "Job $jobId did not become terminal."
}
function TenantBulk($token,$base,$name,$permission,$csv) {
    $template=Invoke-WebRequest -Uri "$ApiBase$base/template?ModuleId=$($permission.ModuleId)&OperationId=$($permission.OperationId)" -Headers (Headers $token)
    Set-Content -LiteralPath (Join-Path $out "$name-template.csv") -Value $template.Content -Encoding utf8
    Record $name 'template-export' 'PASS' "HTTP $($template.StatusCode)"
    $preview=Invoke-RestMethod -Method Post -Uri "$ApiBase$base/preview" -Headers (Headers $token) -Form @{ModuleId=$permission.ModuleId;OperationId=$permission.OperationId;RequestId=[guid]::NewGuid().ToString();PastedText=$csv}
    $preview | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $out "$name-preview.json") -Encoding utf8
    Record $name 'preview' ($(if($preview.data.canCommit){'PASS'}else{'FAIL'})) (($preview.data.errors + ($preview.data.rows.errors|Where-Object{$_})) -join '; ') $preview.data.jobId
    if(-not $preview.data.canCommit){ throw "$name preview blocked: $($preview.data.errors -join '; ')" }
    $jobId=$preview.data.jobId
    $body=@{moduleId=$permission.ModuleId;operationId=$permission.OperationId;jobId=$jobId}|ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "$ApiBase$base/confirm" -Headers (Headers $token) -ContentType 'application/json' -Body $body | Out-Null
    $job=WaitTenantJob $token $base $jobId $permission
    $ok=[int]$job.status -in 4,5 -and [int]$job.failedCount -eq 0
    Record $name 'confirm-worker' ($(if($ok){'PASS'}else{'FAIL'})) "status=$($job.status), created=$($job.createdCount), existing=$($job.existingCount), failed=$($job.failedCount)" $jobId
    $report=Invoke-WebRequest -Uri "$ApiBase$base/jobs/$jobId/report?ModuleId=$($permission.ModuleId)&OperationId=$($permission.OperationId)" -Headers (Headers $token)
    Set-Content -LiteralPath (Join-Path $out "$name-report.csv") -Value $report.Content -Encoding utf8
    Record $name 'report-export' 'PASS' "HTTP $($report.StatusCode), bytes=$($report.Content.Length)" $jobId
    $job
}
function WaitHostJob($token,$base,$jobId,$permission,$tenantId) {
    for($i=0;$i -lt 40;$i++){
        $q="ModuleId=$($permission.ModuleId)&OperationId=$($permission.OperationId)&JobId=$jobId";if($tenantId){$q+="&TenantId=$tenantId"}
        $d=(Invoke-RestMethod -Uri "$ApiBase$base/job?$q" -Headers (Headers $token)).data
        if([int]$d.status -in 4,5,6,7){return $d};Start-Sleep -Seconds 2
    };throw "Host job $jobId did not become terminal."
}
function HostBulk($token,$base,$name,$permission,$csv,$tenantId=$null) {
    $q="ModuleId=$($permission.ModuleId)&OperationId=$($permission.OperationId)"
    $template=Invoke-WebRequest -Uri "$ApiBase$base/template?$q" -Headers (Headers $token)
    Set-Content -LiteralPath (Join-Path $out "$name-template.csv") -Value $template.Content -Encoding utf8
    Record $name 'template-export' 'PASS' "HTTP $($template.StatusCode)"
    $form=@{ModuleId=$permission.ModuleId;OperationId=$permission.OperationId;RequestId=[guid]::NewGuid().ToString();PastedText=$csv};if($tenantId){$form.TenantId=$tenantId}
    $preview=Invoke-RestMethod -Method Post -Uri "$ApiBase$base/preview" -Headers (Headers $token) -Form $form
    Record $name 'preview' ($(if($preview.data.canCommit){'PASS'}else{'FAIL'})) (($preview.data.errors + ($preview.data.rows.errors|Where-Object{$_})) -join '; ') $preview.data.jobId
    if(-not $preview.data.canCommit){throw "$name preview blocked: $($preview.data.errors -join '; ')"}
    $jobId=$preview.data.jobId;$action=@{moduleId=$permission.ModuleId;operationId=$permission.OperationId;jobId=$jobId};if($tenantId){$action.tenantId=$tenantId}
    Invoke-RestMethod -Method Post -Uri "$ApiBase$base/confirm" -Headers (Headers $token) -ContentType 'application/json' -Body ($action|ConvertTo-Json) | Out-Null
    $job=WaitHostJob $token $base $jobId $permission $tenantId
    $ok=[int]$job.status -in 4,5 -and [int]$job.failedCount -eq 0
    Record $name 'confirm-worker' ($(if($ok){'PASS'}else{'FAIL'})) "status=$($job.status), created=$($job.createdCount), existing=$($job.existingCount), failed=$($job.failedCount)" $jobId
    $rq="$q&JobId=$jobId";if($tenantId){$rq+="&TenantId=$tenantId"}
    $report=Invoke-WebRequest -Uri "$ApiBase$base/report?$rq" -Headers (Headers $token)
    Set-Content -LiteralPath (Join-Path $out "$name-report.csv") -Value $report.Content -Encoding utf8
    Record $name 'report-export' 'PASS' "HTTP $($report.StatusCode), bytes=$($report.Content.Length)" $jobId
    $job
}

try {
    $hostSession=Login $HostLoginId $HostPassword;$tenantSession=Login $TenantLoginId $TenantPassword
    $hm=Menu $hostSession.accessToken;$tm=Menu $tenantSession.accessToken
    $hostPerm=@{};foreach($c in 'HOST_DEVICE_SETUP','HOST_TENANT_RFID_MANAGEMENT','HOST_MODULES','HOST_SUBMODULES','HOST_OPERATIONS','HOST_MODULE_OPERATIONS'){$hostPerm[$c]=Permission $hm $c 'Import'}
    $tenantPerm=@{};foreach($c in 'DEPARTMENT','DESIGNATION','ROLE','EMPLOYEE_TYPE','EMP_LIST','TENANT_POLICY_TYPES','TENANT_POLICY_DEFINITIONS','TENANT_POLICY_ASSIGNMENTS'){$tenantPerm[$c]=Permission $tm $c 'Import'}
    $viewDef=Permission $tm 'TENANT_POLICY_DEFINITIONS' 'View';$locationView=Permission $tm 'TENANT_LOCATIONS' 'View';$workLocationAdd=Permission $tm 'EMP_WORK_LOCATIONS' 'Add';$workLocationView=Permission $tm 'EMP_WORK_LOCATIONS' 'View'
    $hostTenantList=Permission $hm 'HOST_TENANT_LIST' 'View'
    $tenants=(Invoke-RestMethod -Uri "$ApiBase/api/Tenant/get-all-tenants?ModuleId=$($hostTenantList.ModuleId)&OperationId=$($hostTenantList.OperationId)&PageNumber=1&PageSize=100" -Headers (Headers $hostSession.accessToken)).data
    $selectedTenant=@($tenants)|Where-Object{$_.companyName -match 'Quecksilber'}|Select-Object -First 1
    if(-not $selectedTenant){throw 'Selected Tenant was not found in Host tenant list.'}
    $encodedTenantId=$selectedTenant.id
    $locations=(Invoke-RestMethod -Uri "$ApiBase/api/TenantLocation/get-all?ModuleId=$($locationView.ModuleId)&OperationId=$($locationView.OperationId)&IsActive=true&PageNumber=1&PageSize=100" -Headers (Headers $tenantSession.accessToken)).data
    $location=@($locations)|Select-Object -First 1;if(-not $location){throw 'No active TenantLocation exists for policy applicability.'}
    $locationId=[long]$location.id

    $departmentName='Customer Experience Operations';$designationName='Customer Experience Specialist';$roleName='Customer Experience Lead';$employeeTypeName='Hybrid Full-Time'
    $dept=TenantBulk $tenantSession.accessToken '/api/Department/bulk' 'department' $tenantPerm.DEPARTMENT (Csv ([pscustomobject]@{DepartmentName=$departmentName;Description='Customer onboarding, adoption and service continuity';Remark='Operational customer experience team';IsActive='true'}))
    $deptId=[int](ReportId 'department')
    $desig=TenantBulk $tenantSession.accessToken '/api/Designation/bulk' 'designation' $tenantPerm.DESIGNATION (Csv ([pscustomobject]@{DesignationName=$designationName;DepartmentName=$departmentName;Description='Owns customer onboarding and adoption outcomes';IsActive='true'}))
    $designationId=[int](ReportId 'designation')
    $role=TenantBulk $tenantSession.accessToken '/api/Role/bulk' 'role' $tenantPerm.ROLE (Csv ([pscustomobject]@{RoleName=$roleName;RoleType='3';Remark='Leads customer experience delivery';IsActive='true'}))
    $roleId=[int](ReportId 'role')
    $etype=TenantBulk $tenantSession.accessToken '/api/EmployeeType/bulk' 'employee-type' $tenantPerm.EMPLOYEE_TYPE (Csv ([pscustomobject]@{TypeName=$employeeTypeName;Description='Full-time hybrid employees attached to a primary office';Remark='Eligible for hybrid attendance policy';IsActive='true'}))
    $employeeTypeId=[int](ReportId 'employee-type')

    $lookups=(Invoke-RestMethod -Uri "$ApiBase/api/TenantPolicy/lookups?ModuleId=$($viewDef.ModuleId)&OperationId=$($viewDef.OperationId)" -Headers (Headers $tenantSession.accessToken)).data
    $attendanceRuleId=[int](@($lookups.ruleTypes)|Where-Object code -eq 'ATTENDANCE_CHANNEL'|Select-Object -First 1).id
    $eligibilityRuleId=[int](@($lookups.ruleTypes)|Where-Object code -eq 'ELIGIBILITY'|Select-Object -First 1).id
    $policyTypeCode='HYBRID_ATTENDANCE';$policyCode='INDIA_HYBRID_ATTENDANCE_LOCATION'
    $ptype=TenantBulk $tenantSession.accessToken '/api/TenantPolicy/bulk/types' 'policy-type' $tenantPerm.TENANT_POLICY_TYPES (Csv ([pscustomobject]@{PolicyTypeCode=$policyTypeCode;PolicyName='Hybrid Attendance';PolicyCategoryCode='ATTENDANCE';Description='Attendance rules for employees alternating between office and remote work';DefaultCurrencyCode='INR';IsActive='true'}))
    $rules=ConvertTo-Json -InputObject @(@{policyRuleTypeId=$attendanceRuleId;ruleName='Approved attendance channels';ruleOrder=1;ruleConfiguration=(@{allowedChannels=@('WEB','MOBILE','BIOMETRIC');requireGeoFenceForOffice=$true;requireGpsForRemote=$true;allowOutsideLocationWithApproval=$true}|ConvertTo-Json -Compress)},@{policyRuleTypeId=$eligibilityRuleId;ruleName='Hybrid employee eligibility';ruleOrder=2;ruleConfiguration=(@{minimumServiceDays=0;employeeType='Hybrid Full-Time'}|ConvertTo-Json -Compress)}) -Compress
    $scope=ConvertTo-Json -InputObject @(@{applicabilityMode=1;tenantLocationId=$locationId;employeeTypeId=$employeeTypeId;priority=100;effectiveFrom='2026-09-19'}) -Compress
    $pdef=TenantBulk $tenantSession.accessToken '/api/TenantPolicy/bulk/definitions' 'policy-definition' $tenantPerm.TENANT_POLICY_DEFINITIONS (Csv ([pscustomobject]@{PolicyCode=$policyCode;PolicyName='India Hybrid Attendance and Location Compliance';PolicyTypeCode=$policyTypeCode;EffectiveFrom='2026-09-19';EffectiveTo='';Summary='Defines valid office and remote attendance channels for hybrid employees assigned to an approved location.';DefaultCurrencyCode='INR';RulesJson=$rules;ApplicabilityJson=$scope}))
    $policyId=[long](ReportId 'policy-definition')
    $detail=(Invoke-RestMethod -Uri "$ApiBase/api/TenantPolicy/$policyId`?ModuleId=$($viewDef.ModuleId)&OperationId=$($viewDef.OperationId)" -Headers (Headers $tenantSession.accessToken)).data
    $versionId=[long]$detail.versionId

    $employeeEmail='aarav.mehta.hybrid@skolenza.example'
    $employeeRow=[pscustomobject]@{EmployeeCode='';FirstName='Aarav';LastName='Mehta';OfficialEmail=$employeeEmail;DateOfBirth='1994-05-18';DateOfOnBoarding='2026-09-19';GenderId='1';CountryId='1';DepartmentId="$deptId";DesignationId="$designationId";EmployeeTypeId="$employeeTypeId";RoleId="$roleId";HasPermanent='true';IsActive='true';MiddleName='';MobileNumber='';ContactName='';ContactNumber='';AlternateNumber='';ContactEmail='';ContactCountryId='';StateId='';DistrictId='';HouseNo='';Street='';LandMark='';Address=''}
    $employee=TenantBulk $tenantSession.accessToken '/api/Employee/bulk' 'employee' $tenantPerm.EMP_LIST (Csv $employeeRow)
    $empView=Permission $tm 'EMP_LIST' 'View'
    $employees=(Invoke-RestMethod -Uri "$ApiBase/api/Employee/get-all?UserEmployeeId=$($tenantSession.user.employeeId)&PageNumber=1&PageSize=500&SortBy=employeeId&SortOrder=desc&ModuleId=$($empView.ModuleId)&OperationId=$($empView.OperationId)" -Headers (Headers $tenantSession.accessToken)).data
    $employeePublic=@($employees)|Where-Object officialEmail -eq $employeeEmail|Select-Object -First 1
    if(-not $employeePublic){throw 'Imported employee was not returned by get-all.'}
    $employeeCode=$employeePublic.employementCode
    $existingLocation=(Invoke-RestMethod -Uri "$ApiBase/api/EmployeeLocationAssignment/get-all?EmployeeId=$($employeePublic.employeeId)&TenantLocationId=$locationId&IsActive=true&PageNumber=1&PageSize=10&ModuleId=$($workLocationView.ModuleId)&OperationId=$($workLocationView.OperationId)" -Headers (Headers $tenantSession.accessToken)).data
    $locationRow=Items $existingLocation|Select-Object -First 1
    if(-not $locationRow){
        $locBody=@{moduleId=$workLocationAdd.ModuleId;operationId=$workLocationAdd.OperationId;employeeId=$employeePublic.employeeId;tenantLocationId=$locationId;isPrimary=$true;isAttendanceAllowed=$true;effectiveFrom='2026-09-19';effectiveTo=$null;isActive=$true}|ConvertTo-Json
        $locAssignment=Invoke-RestMethod -Method Post -Uri "$ApiBase/api/EmployeeLocationAssignment/create" -Headers (Headers $tenantSession.accessToken) -ContentType 'application/json' -Body $locBody
        $locationRow=$locAssignment.data
    }
    Record 'employee-location' 'create-or-existing' 'PASS' "employee=$employeeCode, tenantLocationId=$locationId, assignmentId=$($locationRow.id)"

    $submit=Permission $tm 'TENANT_POLICY_DEFINITIONS' 'Submit';$approvalsModule=$tm|Where-Object moduleCode -eq 'TENANT_POLICY_APPROVALS'|Select-Object -First 1
    function Transition($action,$moduleId,$operationId){$b=@{moduleId=$moduleId;operationId=$operationId;policyVersionId=$versionId;action=$action;comments="Live business-flow smoke: $action"}|ConvertTo-Json;(Invoke-RestMethod -Method Post -Uri "$ApiBase/api/TenantPolicy/versions/$versionId/transition" -Headers (Headers $tenantSession.accessToken) -ContentType 'application/json' -Body $b).data}
    if($detail.status -ne 'Published'){
        Transition 'SUBMIT' $submit.ModuleId $submit.OperationId|Out-Null
        foreach($action in 'APPROVE','PUBLISH'){$op=$approvalsModule.operations|Where-Object name -eq ($action.Substring(0,1)+$action.Substring(1).ToLower())|Select-Object -First 1;if(-not $op){throw "$action permission missing"};Transition $action $approvalsModule.id $op.id|Out-Null}
    }
    Record 'policy-definition' 'publish-or-existing' 'PASS' "policyId=$policyId, versionId=$versionId"

    $passign=TenantBulk $tenantSession.accessToken '/api/TenantPolicy/bulk/assignments' 'policy-assignment' $tenantPerm.TENANT_POLICY_ASSIGNMENTS (Csv ([pscustomobject]@{PolicyCode=$policyCode;VersionNumber='1';EmployeeCode=$employeeCode;EffectiveFrom='2026-09-19';EffectiveTo='';IsMandatory='true'}))
    $assignmentPreview=Get-Content -LiteralPath (Join-Path $out 'policy-assignment-preview.json') -Raw | ConvertFrom-Json
    $employeeDbId=[long]$assignmentPreview.data.rows[0].targetEmployeeId
    if($employeeDbId -le 0){throw 'Policy assignment preview did not resolve the Employee database ID.'}
    $resolved=(Invoke-RestMethod -Uri "$ApiBase/api/TenantPolicy/resolve?EmployeeId=$employeeDbId&EffectiveDate=2026-09-19&ModuleId=$($viewDef.ModuleId)&OperationId=$($viewDef.OperationId)" -Headers (Headers $tenantSession.accessToken)).data
    $matched=@($resolved)|Where-Object policyCode -eq $policyCode
    Record 'employee-policy-resolution' 'resolve' ($(if($matched){'PASS'}else{'FAIL'})) "policy=$policyCode, employee=$employeeCode, matches=$(@($matched).Count)"

    $stamp=Get-Date -Format 'yyyyMMddHHmmss'
    HostBulk $hostSession.accessToken '/api/DeviceMaster/import' 'device-master' $hostPerm.HOST_DEVICE_SETUP (Csv ([pscustomobject]@{SNo="ZK-SFV5L-$stamp";DeviceCode="ZKTECO-SPEEDFACE-V5L-$stamp";DeviceName='ZKTeco SpeedFace V5L Entrance Terminal';CompanyName='ZKTeco';ModelNo='SpeedFace-V5L';DeviceType='FaceFingerprint';IsActive='true'}))|Out-Null
    $cardNumber=('20260919'+(Get-Date -Format 'HHmmssfff')).Substring(0,17)
    HostBulk $hostSession.accessToken '/api/TenantCardMaster/import' 'tenant-card' $hostPerm.HOST_TENANT_RFID_MANAGEMENT (Csv ([pscustomobject]@{CardNumber=$cardNumber;CardReference="QT-CORPORATE-ACCESS-$stamp";PurchaseCurrencyCode='INR';UnitPurchasePriceExcludingTax='150';CgstAmount='13.50';PurchaseInvoiceDate='2026-09-19';IsActive='true'})) $encodedTenantId|Out-Null
    $hostModuleCode="HOST_COMPLIANCE_CENTRE_$stamp";$hostChildCode="HOST_COMPLIANCE_REVIEWS_$stamp";$operationType=[int](Get-Date -Format 'HHmmss')+200000
    HostBulk $hostSession.accessToken '/api/Module/import' 'host-module' $hostPerm.HOST_MODULES (Csv ([pscustomobject]@{ModuleCode=$hostModuleCode;ModuleName='Host-Compliance-Centre';PageName="host-compliance-centre-$stamp";DisplayName='Compliance Centre';URLPath='/app/host-compliance';IsModuleDisplayInUI='true';IsCommonMenu='false';ModuleScope='2';IsActive='true';ImageIconWeb='bi bi-shield-check';ImageIconMobile='shield-checkmark';ItemPriority='850';Remark='Host compliance administration'}))|Out-Null
    HostBulk $hostSession.accessToken '/api/SubModule/import' 'host-submodule' $hostPerm.HOST_SUBMODULES (Csv ([pscustomobject]@{ParentModuleCode=$hostModuleCode;ModuleCode=$hostChildCode;ModuleName='Host-Compliance-Reviews';PageName="host-compliance-reviews-$stamp";DisplayName='Compliance Reviews';URLPath='/app/host-compliance/reviews';ModuleScope='2';IsActive='true';ItemPriority='851';Remark='Review compliance records'}))|Out-Null
    HostBulk $hostSession.accessToken '/api/Operation/import' 'host-operation' $hostPerm.HOST_OPERATIONS (Csv ([pscustomobject]@{OperationName="Review Compliance $stamp";OperationType="$operationType";Remark='Review a compliance record';IsActive='true';IconImage='bi bi-clipboard-check'}))|Out-Null
    HostBulk $hostSession.accessToken '/api/ModuleOperation/import' 'host-module-operation' $hostPerm.HOST_MODULE_OPERATIONS (Csv ([pscustomobject]@{ModuleCode=$hostChildCode;OperationType="$operationType";PageURL='/app/host-compliance/reviews';IconURL='bi bi-clipboard-check';IsCommonItem='false';IsOperational='true';Priority='10';Remark='Compliance review action';IsActive='true'}))|Out-Null
    $evidence.inserted += [ordered]@{department=$departmentName;designation=$designationName;role=$roleName;employeeType=$employeeTypeName;employee='Aarav Mehta';employeeCode=$employeeCode;policy=$policyCode;policyVersionId=$versionId;tenantLocationId=$locationId;hostModule=$hostModuleCode;hostChild=$hostChildCode;hostOperationType=$operationType}
    $evidence.gaps += 'No independent master-data Export endpoint exists for these bulk targets; template and completed-job report are the implemented CSV exports.'
} catch {
    $evidence.results += [ordered]@{target='run';step='exception';status='FAIL';detail=$_.Exception.Message}
    throw
} finally {
    $evidence | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $out 'summary.json') -Encoding utf8
}


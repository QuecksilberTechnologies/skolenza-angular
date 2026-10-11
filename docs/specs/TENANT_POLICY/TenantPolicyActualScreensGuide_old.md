Tenant Policy Actual Screens Guide

**Angular UI ke asli screenshots ke saath click → API → response → database table. 22 September 2026 code inspection. Angular project read-only raha; production API ya DB ko is document ke liye call nahi kiya.**

**Update 26 September 2026:** `development` branch code aur live Swagger se dobara verify kiya. Badle hue points “UPDATE 26 Sep” se marked hain.

Is guide ko kaise padhein: blue UI screenshot dekhein, uske neeche usi button ka route aur table dekhein. “Response” ka matlab API ka data; “table” ka matlab database mein saved row. Red font mein wahi gaps hain jo code/screenshot se verify hue.

**Sabse chhota flow**  
Policy Type \= Annual Leave ka reusable naam. Policy \= India Permanent Annual Leave ka actual record. Policy Version \= us record ka v1 Draft/Published. Rule \= kya likha hai. Applicability \= kin employees par lagegi. Assignment \= kisi employee ko direct policy dena. Resolve \= employee/date ke liye Published policy ka answer.

Policy Types → Policy Definitions Create → Submit → Approve → Publish → Resolve. Documents, Assignments, Exceptions, Acknowledgements, Approval progress, Audit \= Policy Version ke andar tabs, alag main menu screens nahi.

GAP — UI Employee/get-all string employeeId (jaise 1OZ8MZRL) deta hai. Assign/Exception/Applicability UI Number(id) banata hai; backend long employeeId expect karta hai. Is identity mismatch ko fix/test kiye bina real employee flow ko working assume na karein. Ticket: docs/backend-tickets/tenant-policy-employee-id-type-mismatch.md

UPDATE 26 Sep — Resolve fix ho gaya: Swagger mein resolve ka EmployeeId ab string hai, aur Resolve dialog ab lookup ki string employeeId seedha bhejta hai (commit e46265d7). Assign, Exception aur Applicability abhi bhi int64 hain.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Policy Types list**  
**![][image1]**  
Yahan tenant reusable type banata hai. Screenshot mein Annual-Leave, Casual-Leave, Hybrid Attendance aur Travel dikhte hain. Category dropdown ka data PolicyCategory lookup se aata hai.

**Is screen par click karne se kya hota hai**  
**List load**  API: GET /api/TenantPolicy/types \+ GET /api/TenantPolicy/lookups  |  Result/table: data \= type rows \+ categories; read PolicyType, PolicyCategory

**Add Policy Type**  API: POST /api/TenantPolicy/types; body policyTypeCode, policyName, policyCategoryId, defaultCurrencyCode  |  Result/table: data \= created {id,code,name,categoryId,...}; INSERT PolicyType

**Edit / Deactivate**  API: PUT /types/{id} / PATCH /types/{id}/status  |  Result/table: updated type / boolean; UPDATE PolicyType

**Import Policy Types**  API: /api/TenantPolicy/bulk/types/template, preview, confirm, jobs, report, retry, cancel  |  Result/table: valid rows → PolicyType; failed rows report

GAP — Type create hone se Policy/PolicyVersion/employee leave balance create nahi hota. Screenshot ke QA types ko real business types na samjhein.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Policy Definitions list**  
**![][image2]**  
Yeh actual named policies ki list hai. Har row mein naam, code, policy type, latest version aur status. Filter Type/Status/Search se list API dobara chalti hai.

**Is screen par click karne se kya hota hai**  
**List load**  API: GET /api/TenantPolicy?pageNumber=1\&pageSize=10\&policyTypeId=...\&statusId=...\&search=...  |  Result/table: data \= \[{id,code,name,policyTypeId,currentVersionId,versionNumber,status}\], totalRecords; READ Policy \+ PolicyVersion

**Create Policy**  API: POST /api/TenantPolicy  |  Result/table: data \= full policy detail with versionId/rules/applicability; INSERT Policy, PolicyVersion, PolicyRule, PolicyApplicability, PolicyChangeAudit

**Edit draft**  API: PUT /api/TenantPolicy/{policyId}/versions/{versionId}  |  Result/table: full detail; UPDATE Policy/PolicyVersion, REPLACE child Rule/Applicability rows

**Open workspace**  API: Angular navigation /app/tenant-policies/{policyId}/versions/{versionId}  |  Result/table: read detail; no insert

**Import Policies**  API: /api/TenantPolicy/bulk/definitions/...  |  Result/table: confirmed valid rows create Policy \+ Version and children

GAP — Screenshot mein China Leave, Insurance aur Hybrid Attendance rows ka Policy Type “Travel” dikh raha hai. Type Policy.PolicyTypeId se aata hai; names dekhkar correct mapping assume na karein. Actual row IDs verify karke data correct karna hoga.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Create Policy form ke andar Rule aur Applicability**  
**![][image3]**  
Create Policy popup ka neeche wala hissa. Rule ka matlab “kya terms hain”; Applicability ka matlab “kin employees par”. Owner Department top field policy ka owner hai; target Department applicability mein alag field hai.

**Is screen par click karne se kya hota hai**  
**Rule add**  API: POST /api/TenantPolicy body rules:\[{policyRuleTypeId,ruleName,ruleOrder,ruleConfiguration}\]  |  Result/table: PolicyRule rows; ruleConfiguration JSON object ka STRING, e.g. {"days":18}

**Applicability add**  API: same POST body applicability:\[{applicabilityMode,countryId,stateId,tenantLocationId,employeeTypeId,priority,effectiveFrom,...}\]  |  Result/table: PolicyApplicability rows; 1 Include / 2 Exclude

**Create Policy**  API: POST /api/TenantPolicy; top \+ rules \+ applicability ek body  |  Result/table: response data \= policy detail; all 4 core tables in one creation

GAP — Raw JSON ka syntax valid hona business calculation ka proof nahi. Generic resolver ruleConfiguration se leave days, balance, attendance ya insurance payout calculate nahi karta. Work arrangement/employment-status selector UI mein nahi, although backend fields exist; form hamesha null bhejta hai (policy-definition-form.ts). Tickets: docs/backend-tickets/tenant-policy-rule-configuration-schema-undefined.md, docs/backend-tickets/tenant-policy-applicability-work-arrangement-employment-status-legend-missing.md

Tenant Policy actual UI and API map   •   22 Sep 2026

**Create Policy mein Rule ka poora matlab**  
**![][image4]**  
**Rules (1) \= ek PolicyRule row. Rule type dropdown PolicyRuleType seed/lookup se aata hai: Eligibility, Entitlement, Accrual, Carry Forward, Sandwich, Limit, Attendance Channel, Late Penalty, Overtime, Approval, Reimbursement, Calendar, Custom Rule. Ye names rule ki category batate hain; inke liye executable JSON schema ka evidence nahi mila.**

Rule type: e.g. Entitlement choose karne par API ko us type ka actual policyRuleTypeId jaata hai. Name: e.g. Annual entitlement, HR ke liye readable label. Configuration (JSON): terms ka object. 2 Rules add karenge to 2 PolicyRule rows; UI array order se ruleOrder 1, 2 set karta hai. Same order duplicate backend reject karta hai.

Rule aur Applicability ka difference: Rule \= “kya likha hai” (18 days); Applicability \= “kis par aur kab” (India \+ Permanent \+ dates). Entitlement rule apne aap kisi employee ko 18 days credit nahi karta. Rules (0) allowed hain, isliye policy bina rules ke bhi create/publish ho sakti hai.

Rule Type Entitlement select karte hi days/unit ka form ya backend calculation activate hoti hai—aisa current code mein nahi hai. Dropdown ke labels ko calculator mat samjhein.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Configuration JSON ka exact format**  
**![][image5]**  
**Textarea mein jo likhna hai (example declaration): {"days":18,"unit":"DAY"}. Curly braces { } required hain; key aur text value double quotes mein. Number 18 ko quotes ki zaroorat nahi. Comma entries ko separate karta hai. Example meaning HR intention hai: annual entitlement 18 days. Current backend is JSON se balance calculate nahi karta.**

UI → API: textarea ki poori value string ban kar ruleConfiguration mein jaati hai. Copyable outer request ka relevant part: "rules":\[{"policyRuleTypeId":\<lookup ID\>,"ruleName":"Annual entitlement","ruleOrder":1,"ruleConfiguration":"{\\"days\\":18,\\"unit\\":\\"DAY\\"}"}\]. Backslashes sirf outer HTTP JSON string ke escaping ke liye hain; textarea mein backslashes nahi likhne.

DB: PolicyRule.RuleConfiguration PostgreSQL jsonb hai. GET policy detail mein rules:\[{id,ruleTypeId,name,order,configuration}\] milta hai; configuration UI/API type mein JSON string hai. RuleTypeId dropdown ke active PolicyRuleType row se hi aana chahiye.

Valid syntax: {"days":18,"unit":"DAY"} aur {}. Invalid: days:18 (quotes/braces missing), \[1,2\] (array), 18 (number), null (JSON null). Backend valid JSON object, active Rule Type ID aur unique ruleOrder check karta hai. UI non-empty textarea maangti hai; {} object backend syntax se valid hai.

Carry Forward example {"maxDays":5,"expiryMonths":3} aur Attendance Channel example {"allowedChannels":\["WEB","MOBILE"\]} sirf storage-format examples hain. Backend in keys ka meaning/range ya actual carry-forward/attendance action validate ya execute nahi karta. Production rule ke liye category-wise schema aur execution contract pehle define/test karna hoga.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Applicability fields ka seedha matlab**  
**![][image6]**  
**Yeh 1 Applicability row hai. Row ke andar selected fields AND hain: employee ko har bhari hui condition match karni hogi. Blank/Any/null field us property par filter nahi lagata. Date “From” required hai. Include \= matching employee ko policy mile; Exclude \= matching employee ko policy na mile.**

GenderId: Female select karenge to sirf Employee.GenderId=Female; Male/Other bhi apni lookup ID se. “Any gender” (null) ka matlab Female, Male, Other sab allowed, agar baaki selected filters match karte hon.

DepartmentId: Human Resources select \= sirf Employee.DepartmentId=Human Resources. “Any department”/null \= kisi bhi department ka employee. Yeh Create Policy ke top wale Owner department se alag field hai.

DesignationId: CEO select \= sirf Employee.DesignationId=CEO. “Any designation”/null \= kisi bhi designation. Department \+ Designation dono select hon to employee ke dono values match hongi.

EmployeeTypeId: Full Time select \= sirf matching employee type. TenantLocationId/geography: selected office aur country/state/district/locality match hone chahiye. EmployeeId select ho to sirf wahi person. MinimumServiceDays bharne par onboarding date se calculated service days kam nahi ho sakte.

**“Any service length” \= minimumServiceDays:null. Employee ne kal join kiya ho ya 5 saal pehle, tenure filter nahi lagega. 90 bharen to Resolve ki effective date par Employee.DateOfOnBoarding se kam se kam 90 calendar days poore hone chahiye. Backend serviceDays \= max(0, effective date − onboarding date) calculate karta hai; onboarding date absent ho to 0 maana jaata hai. 0 bharne par practically sab pass; null ka matlab condition skip. Yeh years-of-experience ya designation nahi, isi company ki recorded onboarding se din hain.**

Screenshot mein Human Resources aur CEO ek saath selected hain. Agar CEO designation HR department ki nahi hai, backend “DesignationId does not belong to DepartmentId” validation error dega. Actual designation-department mapping verify karein.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Null karne par exactly kya hota hai**  
**![][image7]**

**Chaar chhote examples**  
A. India \+ Permanent \+ Gender null \+ Department null \+ Designation null: India Permanent employee apply hoga, uska gender/department/designation jo bhi ho. Null sirf usi filter ko hatata hai.

B. Country null \+ Gender Female \+ baaki sab null: is tenant ki kisi bhi location ki Female employee match karegi, dates/status ke andar. Country null \= sirf India nahi.

C. Country, State, District, Locality, TenantLocation, EmployeeType, Department, Designation, Employee, Gender, WorkArrangement, EmploymentStatus, MinimumServiceDays — sab null; Include row aur valid From date: tenant ke sab employees ko broadly match karegi. Yeh global eligibility hai, sirf ek “empty” row nahi.

D. Applicability rows hi zero: automatic Resolve ko scope match nahi milega. Published version bhi auto-eligible list mein nahi aayega; date-valid manual assignment ho to wo version aa sakta hai.

All-null EXCLUDE row sab employees ko broadly exclude karti hai, lekin resolver same version mein zyada specific Include row ko pehle choose kar sakta hai. Isliye Exclude ko bina soch-samajh global mat lagayein.

Row ke fields \= AND. Alag Include rows \= alternative matches (OR). Resolver matching rows mein pehle specificity, phir kam numeric priority dekhta hai; same specificity aur priority par Exclude jeetta hai. “500” priority hai, 500 employees ya 500 days nahi.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Database row aur API ka connection**  
**![][image8]**  
Is screenshot mein PolicyApplicability table ke 25 columns dikhte hain. Har row ek PolicyVersionId se linked hai. CountryId=1 aur EmployeeTypeId=7 wali row ka matlab sirf wahi country/type combination; baaki null columns us row mein filter nahi hain. Numeric IDs ka meaning master tables se join/lookup karke dekhein, screenshot se 1=India ya 7=Permanent assume na karein.

**Save request mein kya bhejna hai**  
POST /api/TenantPolicy ya Draft PUT mein applicability:\[{applicabilityMode:1,countryId:null,stateId:null,districtId:null,localityId:null,tenantLocationId:null,employeeTypeId:null,departmentId:null,designationId:null,employeeId:null,genderId:null,workArrangementType:null,employmentStatus:null,minimumServiceDays:null,priority:500,effectiveFrom:"2026-10-01",effectiveTo:null}\]

Save ke baad PolicyApplicability row insert hoti hai. GET /api/TenantPolicy/{policyId} mein applicability array wapas aati hai; uska “mode” write wale “applicabilityMode” ka read name hai. GET /api/TenantPolicy/resolve?employeeId=\<string, jaise 1OZ8MZRL\>\&effectiveDate=2026-10-01 Published/current version ki rows ko employee se compare karta hai. Draft ya Approved version resolve mein nahi aati.

**Gender, Department, Designation null ko backend (\!field.HasValue || field \== Employee.field) se evaluate karta hai. Isliye null wildcard hai. Country/Location null bhi unki condition skip karta hai. Code source: GenericPolicyRepository.ScopeMatches, ScopeSpecificity, ResolveAsync; UI source: policy-definition-form.ts/html.**

Production blocker: public EmployeeId 1OZ8MZRL jaisi string hai, lekin PolicyApplicability.EmployeeId numeric long hai. (UPDATE 26 Sep: Resolve request ab string leta hai.) “Any employee” null par yeh mismatch nahi aata; specific employee picker/Resolve par aata hai.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Effective Policies popup**  
**![][image9]**  
Definitions list ka Resolve button. Employee aur effective date chuniye. Ye preview hai: “is tareekh ko is employee par kaunsi Published policy lagti hai?”

**Is screen par click karne se kya hota hai**  
**Resolve**  API: GET /api/TenantPolicy/resolve?employeeId={string employeeId}\&effectiveDate=YYYY-MM-DD  |  Result/table: data \= \[{policyId,policyVersionId,policyCode,policyName,priority,resolutionSource}\]; READ Published PolicyVersion \+ Applicability \+ Assignment \+ employee location; WRITE kuch nahi

UPDATE 26 Sep — Employee ID gap yahan fix hai: dropdown ki string employeeId seedha API ko jaati hai, sab employees select ho sakte hain. GAP — resolutionSource free string hai; APPLICABILITY ke alawa kaunsi values aati hain (ASSIGNMENT? EXCEPTION?) API ne define nahi kiya. Resolve empty data ka matlab us date par matching Published policy nahi; automatic assignment row ka absence nahi.

 

**Policy Approvals**  
**![][image10]**  
Yeh screen approval ka route/gate configure karti hai. Screenshot mein zero stage dikh raha hai. Stage banana aur policy approve karna do alag kaam hain.

**Is screen par click karne se kya hota hai**  
**List**  API: GET /api/TenantPolicy/approval-stages  |  Result/table: data \= \[{id,policyCategoryId,stageName,stageOrder,approverRoleId,minimumApprovals,isMandatory,isActive}\]; READ PolicyApprovalStage

**Add Stage**  API: POST /api/TenantPolicy/approval-stages  |  Result/table: INSERT PolicyApprovalStage; policyCategoryId null \= all categories

**Edit / Disable**  API: PUT /approval-stages/{id} / DELETE /approval-stages/{id}  |  Result/table: UPDATE/disable PolicyApprovalStage; prior history retained

**Actual Approve**  API: Definitions row → POST /versions/{versionId}/transition action APPROVE  |  Result/table: PolicyApprovalHistory if mandatory stages; PolicyVersion may become Approved

GAP — Screenshot mein stage blank hai. Backend mandatory stage na hone par Under Review → Approve direct Approved kar sakta hai; multi-person gate chahiye to stages configure/test karna hoga.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Policy lifecycle buttons**  
**![][image11]**  
Definitions row ka menu status ke hisaab se badalta hai. Create ke baad Draft, fir Under Review, Approved, Published. Sirf Published/current/date-valid version Resolve mein milta hai.

**Is screen par click karne se kya hota hai**  
**Submit for review**  API: POST /api/TenantPolicy/versions/{versionId}/transition; action SUBMIT  |  Result/table: PolicyVersion status Under Review \+ PolicyChangeAudit

**Approve / Reject**  API: same API; action APPROVE / REJECT  |  Result/table: PolicyApprovalHistory if stages configured; PolicyVersion status; audit

**Publish**  API: same API; action PUBLISH  |  Result/table: PolicyVersion Published \+ IsCurrent=true; previous current unset; audit

**Archive**  API: same API; action ARCHIVE  |  Result/table: PolicyVersion Archived \+ IsCurrent=false; audit

GAP — Approved status ko Published samajhkar employee ke liye active mat maanien. Publish alag click hai.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Policy Version Documents**  
**![][image12]**  
Workspace ka Documents tab. Document Type dropdown /lookups se. File binary object storage mein, uski metadata PolicyDocument row mein.

**Is screen par click karne se kya hota hai**  
**List**  API: GET /api/TenantPolicy/versions/{versionId}/documents  |  Result/table: data \= \[{id,title,originalFileName,languageCode,isEmployeeVisible,url}\]; READ PolicyDocument

**Upload**  API: POST /api/TenantPolicy/documents multipart file,policyVersionId,policyDocumentTypeId,documentTitle,languageCode,isEmployeeVisible  |  Result/table: data \= document object; INSERT PolicyDocument \+ upload object

**Open / Delete**  API: temporary url / DELETE /api/TenantPolicy/documents/{documentId}  |  Result/table: Open read only; Delete soft-delete PolicyDocument \+ stored file action

GAP — Published/Archived version par backend document mutation allow nahi karta. URL temporary hai; permanent link ke roop mein save na karein.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Policy Version Assignments**  
**![][image13]**  
Assignments tab manual assignments dikhata hai. Applicability se automatically matched employees yahan list nahi hote. “No manual assignments” ka matlab policy kisi par nahi lagegi, aisa nahi.

**Is screen par click karne se kya hota hai**  
**List**  API: GET /api/TenantPolicy/versions/{versionId}/assignments  |  Result/table: data \= manual assignment rows; READ PolicyAssignment

**Assign employees**  API: POST /api/TenantPolicy/assignments; policyVersionId,employeeIds:\[numeric\],effectiveFrom,effectiveTo,isMandatory  |  Result/table: data \= {inserted,existing}; INSERT/reactivate PolicyAssignment \+ missing PolicyAcknowledgement

**Remove / Import**  API: DELETE /assignments/{id}; /bulk/assignments/...  |  Result/table: assignment inactive / bulk valid rows assigned

GAP — Only Published version assignable. UI selected string IDs ko Number(id) banata hai; real alphanumeric employee IDs drop ho jaate hain (dialog unka count dikhata hai). Ticket: docs/backend-tickets/tenant-policy-employee-id-type-mismatch.md. Import address-bar version se restricted nahi: file mein policy/version per row aata hai.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Policy Version Exceptions**  
**![][image14]**  
Exceptions tab ek employee ki temporary override request rakhta hai. Example: special period ke liye alag terms. Ye policy-wide Rule edit nahi hai.

**Is screen par click karne se kya hota hai**  
**Submit exception**  API: POST /api/TenantPolicy/exceptions; employeeId,policyVersionId,exceptionType,overrideConfiguration,reason,effectiveFrom,effectiveTo  |  Result/table: data \= new exception ID; INSERT PolicyException

**Approve / Reject exception**  API: POST /api/TenantPolicy/exceptions/{id}/decision; approve true/false  |  Result/table: data \= boolean; UPDATE PolicyException approvalStatusId

**List**  API: GET /api/TenantPolicy/versions/{versionId}/exceptions  |  Result/table: data \= exception rows; READ PolicyException

GAP — Exception type UI numeric input hai, meaningful label/enum select nahi; approvalStatusId values bhi documented nahi. Ticket: docs/backend-tickets/tenant-policy-exception-approval-status-undocumented.md. Employee ID mismatch yahan bhi hai. Stored overrideConfiguration ko actual payroll/leave execution maan kar na chalayein.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Policy Version Clone and Audit**  
**![][image15]**  
Workspace mein Clone se naya Draft version banta hai. Audit tab policy ke sab versions ki changes dikhata hai; sirf current version ki nahi.

**Is screen par click karne se kya hota hai**  
**Clone**  API: POST /api/TenantPolicy/{policyId}/versions/clone; sourceVersionId,effectiveFrom,changeSummary  |  Result/table: data \= new versionId; INSERT PolicyVersion, copy PolicyRule \+ PolicyApplicability, audit

**Audit**  API: GET /api/TenantPolicy/{policyId}/audit  |  Result/table: data \= \[{entityName,actionName,policyVersionId,changedById,changedDateTime,...}\]; READ PolicyChangeAudit

**Approval progress tab**  API: GET /api/TenantPolicy/versions/{versionId}/approval-progress  |  Result/table: data \= stageId,minimumApprovals,approvalCount,isComplete; READ Stage \+ History

**Acknowledgements tab**  API: GET /versions/{versionId}/acknowledgements; POST /acknowledgements for signed-in user  |  Result/table: READ/UPDATE PolicyAcknowledgement

GAP — Workspace URL versionId leta hai, par header GET /{policyId} se current/latest version fetch karta hai. Purana version URL kholne par header aur tabs alag versions ke hote hain. UPDATE 26 Sep — Ab yeh silent nahi: warning banner dikhta hai aur status-dependent actions disabled hote hain (policy-version-workspace.html). Root cause, version-specific read API, abhi bhi missing. Ticket: docs/backend-tickets/tenant-policy-version-scoped-read-missing.md. Clone documents/assignments copy nahi karta.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Ek actual business example**  
HR ko 1 October se India ke Permanent employees ke liye 18 day annual leave terms record karne hain.

Policy Types → Leave category mein Annual Leave type existing hai to select karein; warna Add Type. PolicyType row banta hai. Abhi employee ko kuch assign nahi hua.

Policy Definitions → Create Policy: India Permanent Annual Leave; Rule “Annual entitlement”, JSON string {"days":18,"unit":"DAY"}; Applicability Include India \+ Permanent \+ 1 October. Policy \+ v1 Draft \+ Rule \+ Applicability rows bante hain.

Draft row → Submit; approver → Approve; Approved row → Publish. Tabhi current Published version Resolve mein aayega.

Effective Policies → ek valid employee \+ 1 October select. Response mein policy aaye to source APPLICABILITY. PolicyAssignment row automatically nahi banti.

Special employee ko direct dena ho to Assignments tab. Leave balance 18 credit karna generic Policy Rule save/Resolve API ka kaam nahi; uski separate business integration verify karni hogi.

**Abhi kya missing ya broken hai**  
GAP — Employee identity mapping: string public employeeId vs numeric policy employeeId. Highest priority fix/test. UPDATE 26 Sep: Resolve fixed; Assign, Exception, Applicability pending. Ticket: docs/backend-tickets/tenant-policy-employee-id-type-mismatch.md

GAP — Screenshots mein Insurance/Attendance ka Policy Type Travel hai. DB PolicyTypeId mapping verify/correct. Yeh data issue hai, frontend code se fix nahi hoga (HR + CEO designation-department mismatch bhi data issue hai).

GAP — Old version ke liye version-scoped detail/read screen aur version list missing. UPDATE 26 Sep: header mismatch par ab warning banner dikhta hai. Tickets: docs/backend-tickets/tenant-policy-version-scoped-read-missing.md, docs/backend-tickets/tenant-policy-version-list-endpoint-missing.md

GAP — Automatic applicability se matched employees ka bulk coverage preview/list nahi; Resolve one employee/date hai. Ticket: docs/backend-tickets/tenant-policy-coverage-preview-endpoint-missing.md

GAP — Employee self-service “My Policies” dedicated route nahi mila. UPDATE 26 Sep (correction): employee workspace khol hi nahi sakta. tenant-policies route par adminManager = roleTypeGuard([1, 3]) guard hai (features.routes.ts), isliye roleType 2 Employee ko Acknowledge ka koi UI path nahi, manual assignment par bhi nahi. Ticket: docs/backend-tickets/tenant-policy-employee-policy-list-endpoint-missing.md

GAP — Policy Rule ka raw JSON business schema/help aur exception type label missing. Valid JSON means calculated benefit nahi. Tickets: docs/backend-tickets/tenant-policy-rule-configuration-schema-undefined.md, docs/backend-tickets/tenant-policy-exception-approval-status-undocumented.md

GAP (new, 26 Sep) — Access/permissions document nahi hue: route sirf Admin (1) aur Manager (3) ke liye; menu module keys TENANT_POLICY_DEFINITIONS, TENANT_POLICY_TYPES, TENANT_POLICY_APPROVALS. Approve/Reject/Publish Approvals module ki permission check karte hain; Submit/Archive Definitions module ki.

GAP (new, 26 Sep) — Assignments, Exceptions, Acknowledgements aur Audit ki standalone list screens planned hain (/app/tenant-policies/assignments, /exceptions, /acknowledgements, /audit; aside-menu-unmapped-modules.ts). Abhi sirf workspace tabs hain.

GAP (new, 26 Sep) — Naam ka confusion: purana /policies feature (leave/insurance policy types) alag hai aur tenant-policies alag. Dono mein “Policy Types” hai; HR ko clearly batana hoga kaunsa kaunsa hai.

Source: Angular tenant-policies routes/components/service/interfaces; API TenantPolicyController; GenericPolicyDTOs; GenericPolicyRepository; GenericPolicyEntities. Request IDs actual menu/lookups se dynamically len. This was code inspection, not a deployed smoke test.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Policy module mein aur kya banana hai**  
**Seedha jawab: nahi, screenshots wali screens poora product nahi hain. Abhi 3 policy menu pages aur 1 version workspace bana hai. 6 workspace tabs isi ek page ke hisse hain. Is waqt system policy records save aur resolve kar sakta hai; complete employee-facing policy journey aur actual benefit calculation ka evidence nahi mila.**

**Aaj jo UI sach mein hai**

| Screen | Current state | Kaam / database |
| :---- | :---- | :---- |
| Policy Types | Bana hai | Category ke andar reusable type; /types → PolicyType |
| Policy Definitions | Bana hai | Create/edit, rules, applicability, status, import, resolve; /TenantPolicy → Policy and version children |
| Policy Approvals | Bana hai | Approval stages; /approval-stages → PolicyApprovalStage |
| Policy Version workspace | Bana hai | Documents, Assignments, Exceptions, Acknowledgements, Approval progress, Audit tabs; version APIs |
| Employee Type and Tenant Location | Alag feature mein bana hai | Applicability ke input/master; generic policy menu ka part nahi |
| Employee location and work arrangement | Employee profile mein bana hai | Resolve ko date-effective location/work mode yahin se milte hain |
| Leave balance UI | Alag legacy leave feature | Generic PolicyRule JSON se automatic credited balance nahi |

**Complete practical journey ke liye missing UI aur API work**  
Employee My Policies page: Employee apni date-effective Published policies, document aur acknowledge action dekhe. Aaj dedicated route/list API nahi mila; existing Resolve one employee/date hai. Applicability-only employee ke liye acknowledgement backend active PolicyAssignment maangta hai, isliye end-to-end contract decide karna hoga. Saath hi tenant-policies route Employee role ko block karta hai, isliye My Policies ko alag route chahiye jo Employee ke liye khula ho.

Coverage and eligibility page: HR policy/version select karke “kaun eligible hai, kaun exclude hai, kyun” ki employee list dekhe. Aaj Resolve sirf one employee/date hai; existing Assignments tab keval manual assignments dikhata hai. Bulk coverage API/UI nahi mila.

Version history and version-specific detail: HR v1/v2 list khole, exact version ke rules/applicability/documents dekhe, compare kare. Aaj policy list ek version dikhati hai; workspace URL ka versionId header detail API ko nahi jaata. New version-list/detail API/UI contract needed.

Guided Rule editor within Create Policy: Raw JSON textarea ko rule-type-specific named fields, examples aur business validation deni hogi. Yeh same Create/Edit screen ka redesign ho sakta hai, alag page hona zaroori nahi. Backend se supported rule schemas/meaning decide karna hoga.

Policy benefit execution integration: Leave accrual/balance, attendance result, insurance eligibility/claim aur travel allowance actual calculate karne ka backend flow yahan proven nahi. Iske bina extra UI screen bhi business outcome nahi de sakti; category-wise API integration define/test karni hogi.

Tenant Policy actual UI and API map   •   22 Sep 2026

**Ek employee ki poori journey ka checklist**  
**1\. Tenant setup**

Screen/action: PolicyCategory/RuleType/DocumentType lookup seeded; TenantLocation aur EmployeeType available.

Table: Lookup/master tables

**2\. Employee setup**

Screen/action: Employee profile mein type, date-effective location, work arrangement correct.

Table: Employee, EmployeeLocationAssignment, EmployeeWorkArrangement

**3\. HR type banaye**

Screen/action: Policy Types par Annual Leave/Travel/Insurance reusable type.

Table: PolicyType

**4\. HR policy banaye**

Screen/action: Definition mein actual name, Rule “kya”, Applicability “kis par”, dates.

Table: Policy \+ PolicyVersion Draft \+ PolicyRule \+ PolicyApplicability

**5\. Document lagaye**

Screen/action: Version Documents tab mein signed document.

Table: PolicyDocument \+ object storage

**6\. Review aur publish**

Screen/action: Submit → stages ke mutabik Approve → Publish.

Table: PolicyVersion, PolicyApprovalHistory, PolicyChangeAudit

**7\. HR eligibility dekhe**

Screen/action: Resolve one employee/date possible; all-employee coverage missing.

Table: READ PolicyVersion, Applicability, location, Assignment

**8\. Employee apni policy dekhe**

Screen/action: Dedicated My Policies absent; manual assign/acknowledge APIs available, lekin Employee role tenant-policies route nahi khol sakta, isliye acknowledge ka UI path nahi. Automatic applicability-only acknowledgement contract gap.

Table: PolicyAssignment and PolicyAcknowledgement only where applicable

**9\. Actual business effect**

Screen/action: Leave balance/attendance/insurance/travel engine separately integrate/test.

Table: Generic PolicyRule JSON save alone does not execute benefit

Production readiness ke teen immediate blockers: (1) public alphanumeric EmployeeId versus numeric policy EmployeeId mapping (Resolve fixed 26 Sep; Assign/Exception/Applicability pending); (2) screenshot mein wrong Travel policy type on Insurance/Attendance/China Leave; (3) generic policy resolution ko benefit execution samajhne ki galti. Inko red gaps ki tarah treat karein, not “done”.

UI project read-only inspected. This document proposes missing screens/contracts; it does not claim those APIs or screens already exist.

   


[image1]: screens-guide/01-policy-types-list.png

[image2]: screens-guide/02-policy-definitions-list.png

[image3]: screens-guide/03-create-policy-rule-applicability.png

[image4]: screens-guide/04-rule-meaning.png

[image5]: screens-guide/05-rule-configuration-json.png

[image6]: screens-guide/06-applicability-fields.png

[image7]: screens-guide/07-applicability-null-values.png

[image8]: screens-guide/08-applicability-db-row.png

[image9]: screens-guide/09-resolve-dialog.png

[image10]: screens-guide/10-approval-stages.png

[image11]: screens-guide/11-lifecycle-actions.png

[image12]: screens-guide/12-version-documents.png

[image13]: screens-guide/13-version-assignments.png

[image14]: screens-guide/14-version-exceptions.png

[image15]: screens-guide/15-version-clone-audit.png